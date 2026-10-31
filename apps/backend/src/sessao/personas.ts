import type { Persona } from '@caqui/contracts';

/** Login simulado (FR-001): lista fixa de pessoas sintéticas, sem senha. C-0027 demonstra uma liquidação atrasada. */
export const PERSONAS: Persona[] = [
  { id: 'C-0001', papel: 'cliente', nome: 'Dona Marta', descricao: '63 anos, aposentada, primeiro CDB pela parceria' },
  { id: 'C-0002', papel: 'cliente', nome: 'Rafael', descricao: '27 anos, dois resgates em andamento' },
  { id: 'C-0003', papel: 'cliente', nome: 'Camila', descricao: '41 anos, recebeu uma herança' },
  { id: 'C-0014', papel: 'cliente', nome: 'Alice', descricao: '75 anos' },
  { id: 'C-0027', papel: 'cliente', nome: 'Zuleica', descricao: '39 anos, resgate com liquidação atrasada' },
  { id: 'ATENDENTE', papel: 'atendente', nome: 'Jonas', descricao: 'Atendente: fila, protocolo e histórico' },
];

export function personaPorId(id: string): Persona | undefined {
  return PERSONAS.find((persona) => persona.id === id);
}
