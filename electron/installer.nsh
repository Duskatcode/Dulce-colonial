!macro customInstall
  ExecWait '"$INSTDIR\resources\backend\node_modules\.bin\node" \
    "$INSTDIR\resources\backend\scripts\setup-db.js"'
!macroend
