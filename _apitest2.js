(async () => {
  const base = 'http://localhost:3000';
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nick: 'admin', password: '123456' }) });
  const { token } = await login.json();
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  // PART with all lowercase
  const cod = 'tst' + Date.now();
  let r = await fetch(base + '/api/parts', { method: 'POST', headers: H, body: JSON.stringify({ nome: 'pastilha de freio traseira', codigo_interno: cod, codigo_fabricante: 'fri' + Date.now(), unidade: 'un', estoque: 1, valor_medio: 5 }) });
  let p = await r.json();
  console.log('PART  nome:', JSON.stringify(p.nome), '| interno:', p.codigo_interno, '| fab:', p.codigo_fabricante);

  // FORNECEDOR lowercase
  r = await fetch(base + '/api/fornecedores', { method: 'POST', headers: H, body: JSON.stringify({ nome: 'fornecedor teste abc', contato: 'joao silva', telefone: '1199999999', email: 'a@b.com', endereco: 'Rua Baixa, 123', observacoes: 'obs em minúsculo' }) });
  const fo = await r.json();
  console.log('FORN  nome:', JSON.stringify(fo.nome), '| contato:', JSON.stringify(fo.contato), '| endereco(nao muda):', JSON.stringify(fo.endereco), '| email(nao muda):', fo.email, '| obs(nao muda):', JSON.stringify(fo.observacoes));
  if (fo.id) await fetch(base + '/api/fornecedores/' + fo.id, { method: 'DELETE', headers: H });

  // VEICULO lowercase (modelo criado via /modelos + veiculo)
  r = await fetch(base + '/api/marcas');
  const marcas = await r.json();
  const marca = marcas[0] || (await (await fetch(base + '/api/marcas', { method: 'POST', headers: H, body: JSON.stringify({ nome: 'MARCA TESTE' }) })).json());
  r = await fetch(base + '/api/modelos', { method: 'POST', headers: H, body: JSON.stringify({ nome: 'gol g5 1.6', marca_id: marca.id }) });
  const mod = await r.json();
  console.log('MODELO nome:', JSON.stringify(mod.nome));

  if (p.id) await fetch(base + '/api/parts/' + p.id, { method: 'DELETE', headers: H });
})();