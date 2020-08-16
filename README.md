
# Cryptersuite

- It encrypts arbitrary code string
- It can decrypt encrypted code string with manual approval

## How to run

1. Change APPROVE_KEY value with some different value
2. ./run

## How to use

- POST / to encrypt
- POST /d to decrypt
- POST /aliases/:alias/approve?masterKey={{APPROVE_KEY}} to approve session
