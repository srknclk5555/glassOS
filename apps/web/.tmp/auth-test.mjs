const base = 'http://127.0.0.1:3000';
const cookies = [];
function setCookies(setCookie) {
  if (!setCookie) return;
  const cookieItems = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const cookie of cookieItems) {
    const [pair] = cookie.split(';');
    const [name, value] = pair.split('=');
    const existingIndex = cookies.findIndex((c) => c.startsWith(name + '='));
    if (existingIndex >= 0) cookies.splice(existingIndex, 1);
    cookies.push(`${name}=${value}`);
  }
}
function cookieHeader() {
  return cookies.join('; ');
}
async function getCsrf() {
  const resp = await fetch(base + '/api/auth/csrf', { headers: { Accept: 'application/json' } });
  const setCookie = resp.headers.get('set-cookie');
  setCookies(setCookie ? [setCookie] : undefined);
  return resp.json();
}
async function login(csrfToken) {
  const params = new URLSearchParams();
  params.set('csrfToken', csrfToken);
  params.set('email', 'tenant-admin@example.com');
  params.set('password', 'Test1234!');
  params.set('json', 'true');
  const resp = await fetch(base + '/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(),
      Accept: 'application/json',
    },
    body: params.toString(),
    redirect: 'manual',
  });
  const setCookie = resp.headers.get('set-cookie');
  setCookies(setCookie ? [setCookie] : undefined);
  const body = await resp.text();
  return { status: resp.status, location: resp.headers.get('location'), body };
}
async function fetchMaterials() {
  const resp = await fetch(base + '/materials', {
    headers: { Cookie: cookieHeader() },
    redirect: 'manual',
  });
  const body = await resp.text();
  return { status: resp.status, location: resp.headers.get('location'), body };
}
(async () => {
  try {
    const csrf = await getCsrf();
    console.log('csrf', csrf.csrfToken);
    const loginResult = await login(csrf.csrfToken);
    console.log('loginResult', loginResult);
    const materialsResult = await fetchMaterials();
    console.log('materialsResult', { status: materialsResult.status, location: materialsResult.location, bodySnippet: materialsResult.body.slice(0, 500) });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();