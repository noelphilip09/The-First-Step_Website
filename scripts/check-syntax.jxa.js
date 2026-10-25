ObjC.import('Foundation');
function run(argv) {
  const out = [];
  for (const path of argv) {
    const ns = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
    let s = ObjC.unwrap(ns);
    if (typeof s !== 'string') { out.push('ERROR ' + path + ': cannot read'); continue; }
    s = s
      .replace(/^[ \t]*import\s[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/mg, '')
      .replace(/^[ \t]*import\s+['"][^'"]+['"];?[ \t]*$/mg, '')
      .replace(/\bimport\.meta\.url\b/g, '"file:///x"')
      .replace(/\bimport\(/g, 'Promise.resolve(')
      .replace(/^[ \t]*export\s+default\s+async\s+function\s*\(/mg, 'async function __default(')
      .replace(/^[ \t]*export\s+default\s+function\s*\(/mg, 'function __default(')
      .replace(/^[ \t]*export\s+default\s+/mg, 'const __default = ')
      .replace(/^[ \t]*export\s+(?=(const|let|var|function|async|class)\b)/mg, '')
      .replace(/^[ \t]*export\s*\{[^}]*\}(\s*from\s+['"][^'"]+['"])?;?[ \t]*$/mg, '');
    try { new Function(s); out.push('OK    ' + path); }
    catch (e) { out.push('ERROR ' + path + ': ' + e.message + (e.line ? ' (approx. line ' + e.line + ')' : '')); }
  }
  return out.join('\n');
}
