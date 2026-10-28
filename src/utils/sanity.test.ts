describe('setup do Jest', () => {
  it('executa testes TypeScript', () => {
    const soma = (a: number, b: number): number => a + b;
    expect(soma(2, 3)).toBe(5);
  });
});