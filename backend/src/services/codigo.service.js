function generarCodigo() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PQR-${year}-${random}`;
}

module.exports = { generarCodigo };