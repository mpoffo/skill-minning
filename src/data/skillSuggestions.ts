export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

// Sugestões padrão definidas pela empresa.
// Personalize a vontade — 4 categorias com ~7 habilidades cada.
export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "desenvolvimento",
    name: "Desenvolvimento de Software",
    skills: [
      "React",
      "TypeScript",
      "Node.js",
      "Python",
      "SQL",
      "Git",
      "APIs REST",
    ],
  },
  {
    id: "lideranca",
    name: "Gestão e Liderança",
    skills: [
      "Liderança",
      "Gestão de Projetos",
      "Scrum",
      "Comunicação",
      "Coaching",
      "Tomada de Decisão",
      "Negociação",
    ],
  },
  {
    id: "dados",
    name: "Dados e Analytics",
    skills: [
      "Power BI",
      "Excel Avançado",
      "Estatística",
      "Data Storytelling",
      "ETL",
      "Machine Learning",
      "Modelagem de Dados",
    ],
  },
  {
    id: "design",
    name: "Design e UX",
    skills: [
      "Figma",
      "UX Research",
      "Design System",
      "Prototipagem",
      "Acessibilidade",
      "UI Design",
      "Wireframing",
    ],
  },
];
