#!/usr/bin/env bash

API="http://localhost:3000/api/v1"

# Lista de integrantes con sus datos: usuario|correo|contraseña
USUARIOS=(
  "alanoca|alanoca@sarcastic.test|Alanoca2026*"
  "mamani|mamani@sarcastic.test|Mamani2026*"
  "morales|morales@sarcastic.test|Morales2026*"
  "teran|teran@sarcastic.test|Teran2026*"
  "nacho|nacho@sarcastic.test|Nacho2026*"
  "aguilar|aguilar@sarcastic.test|Aguilar2026*"
  "lore|lore@sarcastic.test|Lore2026*"
)

echo "Iniciando registro de integrantes en $API/auth/register..."
echo "---------------------------------------------------------"

for item in "${USUARIOS[@]}"; do
  IFS='|' read -r USERNAME EMAIL PASSWORD <<< "$item"

  echo "Registrando: $USERNAME ($EMAIL)..."

  # Petición POST con curl
  RESPUESTA=$(curl -s -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$USERNAME\",
      \"username\": \"$USERNAME\",
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\"
    }")

  # Muestra la respuesta formateada o cruda
  echo "Respuesta: $RESPUESTA"
  echo "---------------------------------------------------------"
done
