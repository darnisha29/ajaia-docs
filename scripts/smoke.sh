#!/bin/bash
#
# End-to-end smoke test: drives the real HTTP API against a running dev server
# and the live Supabase database, as three different users.
#
# The Vitest suite covers pure logic; this covers the wiring that unit tests
# can't see — cookies, route handlers, Postgres, and Storage together. It is
# especially the check that the authorization rules actually hold over HTTP,
# not just in `resolveAccess`.
#
#   yarn dev            # in one terminal
#   yarn smoke          # in another
#
# Override the target with: BASE=https://your-deploy.vercel.app yarn smoke
#
# Note: this creates and then deletes real documents in whichever database the
# server is pointed at. Don't aim it at anything you care about.

BASE=${BASE:-http://localhost:3000}
DIR=$(dirname "$0")
ADA=$DIR/ada.jar; GRACE=$DIR/grace.jar; ALAN=$DIR/alan.jar
rm -f "$ADA" "$GRACE" "$ALAN"

pass=0; fail=0
check() { # check <label> <actual> <expected>
  if [ "$2" = "$3" ]; then echo "  PASS  $1 ($2)"; pass=$((pass+1));
  else echo "  FAIL  $1 — got '$2', want '$3'"; fail=$((fail+1)); fi
}

login() { curl -s -c "$1" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$2\"}" -o /dev/null -w "%{http_code}"; }
code()  { curl -s -b "$1" -o /dev/null -w "%{http_code}" "${@:2}"; }
body()  { curl -s -b "$1" "${@:2}"; }

echo "--- 1. Auth ---"
check "Ada signs in"            "$(login "$ADA" ada@ajaia.test)"    200
check "Grace signs in"          "$(login "$GRACE" grace@ajaia.test)" 200
check "Alan signs in"           "$(login "$ALAN" alan@ajaia.test)"   200
check "unknown email rejected"  "$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"nobody@ajaia.test"}' -o /dev/null -w '%{http_code}')" 401
check "malformed email is 400"  "$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"not-an-email"}' -o /dev/null -w '%{http_code}')" 400
check "anon list is 401"        "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/documents")" 401

echo "--- 2. Create + edit ---"
jget() { node -pe "JSON.parse(require('fs').readFileSync(0))$1" ; }
DOC=$(body "$ADA" -X POST "$BASE/api/documents" | jget .id)
check "document created" "$([ -n "$DOC" ] && echo yes)" yes

check "rename + content save" "$(code "$ADA" -X PATCH "$BASE/api/documents/$DOC" -H 'Content-Type: application/json' \
  -d '{"title":"Q3 Planning","contentHtml":"<h1>Goals</h1><p><strong>Ship</strong> it</p><ul><li>one</li></ul><script>alert(1)</script>"}')" 200

GOT=$(body "$ADA" "$BASE/api/documents/$DOC")
check "title persisted"      "$(echo "$GOT" | grep -c 'Q3 Planning')" 1
check "formatting preserved" "$(echo "$GOT" | grep -c '<h1>Goals</h1>')" 1
check "script stripped"      "$(echo "$GOT" | grep -c 'alert(1)')" 0

check "empty PATCH is 400" "$(code "$ADA" -X PATCH "$BASE/api/documents/$DOC" -H 'Content-Type: application/json' -d '{}')" 400
check "blank title is 400"  "$(code "$ADA" -X PATCH "$BASE/api/documents/$DOC" -H 'Content-Type: application/json' -d '{"title":"   "}')" 400

echo "--- 3. Isolation before sharing ---"
check "Grace cannot see it (404)"  "$(code "$GRACE" "$BASE/api/documents/$DOC")" 404
check "Grace cannot edit it (404)" "$(code "$GRACE" -X PATCH "$BASE/api/documents/$DOC" -H 'Content-Type: application/json' -d '{"title":"hijack"}')" 404

echo "--- 4. Share as viewer ---"
check "share with Grace" "$(code "$ADA" -X POST "$BASE/api/documents/$DOC/shares" -H 'Content-Type: application/json' -d '{"email":"grace@ajaia.test","role":"viewer"}')" 201
check "sharing to self rejected" "$(code "$ADA" -X POST "$BASE/api/documents/$DOC/shares" -H 'Content-Type: application/json' -d '{"email":"ada@ajaia.test","role":"editor"}')" 400
check "Grace can now read"    "$(code "$GRACE" "$BASE/api/documents/$DOC")" 200
check "viewer cannot write"   "$(code "$GRACE" -X PATCH "$BASE/api/documents/$DOC" -H 'Content-Type: application/json' -d '{"title":"hijack"}')" 403
check "viewer cannot re-share" "$(code "$GRACE" -X POST "$BASE/api/documents/$DOC/shares" -H 'Content-Type: application/json' -d '{"email":"alan@ajaia.test","role":"editor"}')" 403
check "viewer cannot delete"  "$(code "$GRACE" -X DELETE "$BASE/api/documents/$DOC")" 403
check "Alan still shut out"   "$(code "$ALAN" "$BASE/api/documents/$DOC")" 404
check "doc shows in Grace's list" "$(body "$GRACE" "$BASE/api/documents" | grep -c 'Q3 Planning')" 1
check "role reported as viewer"   "$(body "$GRACE" "$BASE/api/documents" | grep -c '"role":"viewer"')" 1

echo "--- 5. Promote to editor ---"
check "role changed"        "$(code "$ADA" -X PATCH "$BASE/api/documents/$DOC/shares/$(body "$ADA" "$BASE/api/documents/$DOC/shares" | jget ".shares.find(s=>s.user.email==='grace@ajaia.test').user.id")" -H 'Content-Type: application/json' -d '{"role":"editor"}')" 200
check "editor can now write" "$(code "$GRACE" -X PATCH "$BASE/api/documents/$DOC" -H 'Content-Type: application/json' -d '{"contentHtml":"<p>Grace edited this</p>"}')" 200
check "editor still cannot re-share" "$(code "$GRACE" -X POST "$BASE/api/documents/$DOC/shares" -H 'Content-Type: application/json' -d '{"email":"alan@ajaia.test","role":"editor"}')" 403
check "editor still cannot delete"   "$(code "$GRACE" -X DELETE "$BASE/api/documents/$DOC")" 403
check "Ada sees Grace's edit"        "$(body "$ADA" "$BASE/api/documents/$DOC" | grep -c 'Grace edited this')" 1

echo "--- 6. File import ---"
printf '# Imported Heading\n\nSome **bold** text.\n\n- alpha\n- beta\n\n[link](https://example.com)\n' > "$DIR/sample.md"
printf 'Plain line one.\n\nSecond paragraph.\n' > "$DIR/sample.txt"
printf 'binary-not-really' > "$DIR/sample.png"

IMP=$(curl -s -b "$ADA" -X POST "$BASE/api/documents/import" -F "file=@$DIR/sample.md")
IMPID=$(echo "$IMP" | jget .id)
check "md import created doc" "$([ -n "$IMPID" ] && echo yes)" yes
check "title from filename"   "$(echo "$IMP" | grep -c '"title":"sample"')" 1
IMPBODY=$(body "$ADA" "$BASE/api/documents/$IMPID")
check "md heading converted"  "$(echo "$IMPBODY" | grep -c '<h1>Imported Heading</h1>')" 1
check "md bold converted"     "$(echo "$IMPBODY" | grep -c '<strong>bold</strong>')" 1
check "md list converted"     "$(echo "$IMPBODY" | grep -c '<li>alpha</li>')" 1
check "md link preserved"     "$(echo "$IMPBODY" | grep -c 'https://example.com')" 1
check "txt import works"      "$(curl -s -b "$ADA" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/documents/import" -F "file=@$DIR/sample.txt")" 201
check "png import rejected"   "$(curl -s -b "$ADA" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/documents/import" -F "file=@$DIR/sample.png")" 400
check "anon import rejected"  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/documents/import" -F "file=@$DIR/sample.md")" 401

echo "--- 7. Attachments ---"
ATT=$(body "$ADA" -X POST "$BASE/api/documents/$DOC/attachments" -F "file=@$DIR/sample.txt")
ATTID=$(echo "$ATT" | jget .attachment.id)
check "attachment uploaded"      "$([ -n "$ATTID" ] && echo yes)" yes
check "attachment listed"        "$(body "$ADA" "$BASE/api/documents/$DOC/attachments" | grep -c 'sample.txt')" 1
check "signed URL minted"        "$(body "$ADA" "$BASE/api/documents/$DOC/attachments/$ATTID" | grep -c 'token=')" 1
check "Alan cannot download"     "$(code "$ALAN" "$BASE/api/documents/$DOC/attachments/$ATTID")" 404
SURL=$(body "$ADA" "$BASE/api/documents/$DOC/attachments/$ATTID" | jget .url)
check "signed URL serves bytes"  "$(curl -s "$SURL" | grep -c 'Plain line one')" 1

echo "--- 8. Delete ---"
check "owner deletes"        "$(code "$ADA" -X DELETE "$BASE/api/documents/$DOC")" 200
check "deleted doc is gone"  "$(code "$ADA" "$BASE/api/documents/$DOC")" 404
check "gone from Grace list" "$(body "$GRACE" "$BASE/api/documents" | grep -c 'Q3 Planning')" 0

echo ""
echo "=================================="
echo "  PASSED: $pass    FAILED: $fail"
echo "=================================="
[ "$fail" -eq 0 ]
