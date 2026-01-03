const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'src');
const targetDir = path.join(__dirname, '../../renpyAgent/shared/src');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('开始复制 shared 代码...');
console.log(`源目录: ${sourceDir}`);
console.log(`目标目录: ${targetDir}`);

copyDirectory(sourceDir, targetDir);

console.log('✅ 复制完成！');

const packageJsonSource = path.join(__dirname, 'package.json');
const packageJsonTarget = path.join(__dirname, '../../renpyAgent/shared/package.json');
fs.copyFileSync(packageJsonSource, packageJsonTarget);
console.log('✅ package.json 已复制');

const tsconfigSource = path.join(__dirname, 'tsconfig.json');
const tsconfigTarget = path.join(__dirname, '../../renpyAgent/shared/tsconfig.json');
fs.copyFileSync(tsconfigSource, tsconfigTarget);
console.log('✅ tsconfig.json 已复制');
