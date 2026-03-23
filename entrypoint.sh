#!/bin/sh

cat <<EOF > /app/dist/env.js
window.__ENV = {
  API_URL: "${API_URL:-}"
};
EOF

exec serve dist -l 4173
