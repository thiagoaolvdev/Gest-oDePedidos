(async () => {
  const base = 'http://localhost:3000';
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick: 'admin', password: '123456' }) });
  const { token } = await login.json();
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  const cod = 'TST' + Date.now();
  const body = {
    nome: 'amortecedor teste xyz',
    codigo_interno: cod,
    codigo_fabricante: 'fab' + Date.now(),
    categoria_id: null, unidade: 'un', estoque: 1, valor_medio: 10
  };
  const r = await fetch(base + '/api/parts', { method: 'POST', headers: H, body: JSON.stringify(body) });
  console.log('POST parts status:', r.status);
  const txt = await r.text();
  console.log('response:', txt);
  const created = JSON.parse(txt);
  if (created && created.id) {
    console.log('SALVO => nome:', created.nome, '| cod_interno:', created.codigo_interno, '| cod_fab:', created.codigo_fabricante);
    console.log('nome uppercase ok:', created.nome === created.nome.toUpperCase());
    console.log('cod_interno uppercase ok:', created.codigo_interno === created.codigo_interno.toUpperCase());
  }
})();