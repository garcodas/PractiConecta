import type { EntityManager } from 'typeorm';
import { DEMO_IDS, DEMO_PASSWORD, type CareerCode, type CompanyStatus, type Role } from './shared/contracts/index.js';
import { createDataSource } from './data-source.js';
import { hashPassword } from './domain/password.js';
import { CompanyProfile, Skill, StudentProfile, User } from './infrastructure/entities.js';

const COMPANIES: { id: string; email: string; name: string; phone: string; status: CompanyStatus }[] = [
  { id: DEMO_IDS.companyTech, email: 'empresa@demo.edu', name: 'Tecnologías del Altiplano', phone: '2200-1000', status: 'APROBADA' },
  { id: DEMO_IDS.companyRetail, email: 'retail@demo.edu', name: 'Comercial La Ceiba', phone: '2200-2000', status: 'APROBADA' },
  { id: DEMO_IDS.companyPending, email: 'pendiente@demo.edu', name: 'Logística Quetzal', phone: '2200-3000', status: 'PENDIENTE' },
];

const STUDENTS: { id: string; email: string; name: string; career: CareerCode; semester: number; skills: string[]; cv: string | null }[] = [
  { id: DEMO_IDS.studentSistemas, email: 'estudiante@demo.edu', name: 'Ana López', career: 'SISTEMAS', semester: 8, skills: ['TypeScript', 'SQL', 'Git'], cv: 'ana-lopez.pdf' },
  { id: DEMO_IDS.studentIndustrial, email: 'carlos@demo.edu', name: 'Carlos Pérez', career: 'INDUSTRIAL', semester: 7, skills: ['Excel', 'Lean'], cv: 'carlos-perez.pdf' },
  { id: DEMO_IDS.studentDiseno, email: 'maria@demo.edu', name: 'María Gómez', career: 'DISENO', semester: 6, skills: ['Figma', 'Ilustración'], cv: null },
];

async function insertUser(manager: EntityManager, id: string, email: string, role: Role, passwordHash: string) {
  await manager.createQueryBuilder().insert().into(User).values({ id, email, role, passwordHash }).orIgnore().execute();
}

const ds = createDataSource();
await ds.initialize();
const passwordHash = await hashPassword(DEMO_PASSWORD);

await ds.transaction(async (manager) => {
  await insertUser(manager, DEMO_IDS.coordinator, 'coordinador@demo.edu', 'COORDINATOR', passwordHash);

  for (const company of COMPANIES) {
    await insertUser(manager, company.id, company.email, 'COMPANY', passwordHash);
    await manager
      .createQueryBuilder()
      .insert()
      .into(CompanyProfile)
      .values({ userId: company.id, name: company.name, contactEmail: company.email, contactPhone: company.phone, status: company.status })
      .orIgnore()
      .execute();
  }

  for (const student of STUDENTS) {
    await insertUser(manager, student.id, student.email, 'STUDENT', passwordHash);
    await manager
      .createQueryBuilder()
      .insert()
      .into(StudentProfile)
      .values({ userId: student.id, fullName: student.name, careerCode: student.career, semester: student.semester, cvFileName: student.cv })
      .orIgnore()
      .execute();
    for (const name of student.skills) {
      await manager.createQueryBuilder().insert().into(Skill).values({ name }).orIgnore().execute();
      const skill = await manager.findOneByOrFail(Skill, { name });
      await manager.query(
        'INSERT INTO student_skills (student_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [student.id, skill.id],
      );
    }
  }
});

await ds.destroy();
console.log('Datos de prueba de identidad cargados');
