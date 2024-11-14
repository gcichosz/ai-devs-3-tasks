export default {
  '*.ts': ['eslint --fix', 'prettier --write', () => 'tsc --skipLibCheck --noEmit'],
  '!*.ts': ['prettier --write --ignore-unknown'],
};