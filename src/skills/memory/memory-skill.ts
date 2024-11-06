export class MemorySkill {
  private readonly memory: string[] = [
    'stolicą Polski jest Kraków',
    'znana liczba z książki Autostopem przez Galaktykę to 69',
    'Aktualny rok to 1999',
  ];

  async recall(): Promise<string[]> {
    return this.memory;
  }
}
