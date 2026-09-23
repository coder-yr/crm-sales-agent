import { validate } from 'class-validator';
import { CreateContactDto } from './contact.dto';

describe('Contact DTO Validation', () => {
  it('should invalidate empty company name / required fields', async () => {
    const dto = new CreateContactDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map(e => e.property)).toEqual(expect.arrayContaining(['companyId', 'firstName', 'lastName']));
  });

  it('should invalidate invalid email', async () => {
    const dto = new CreateContactDto();
    dto.companyId = 'c1';
    dto.firstName = 'First';
    dto.lastName = 'Last';
    dto.email = 'not-an-email';
    const errors = await validate(dto);
    expect(errors.map(e => e.property)).toContain('email');
  });

  it('should invalidate decisionMakerScore > 100', async () => {
    const dto = new CreateContactDto();
    dto.companyId = 'c1';
    dto.firstName = 'First';
    dto.lastName = 'Last';
    dto.decisionMakerScore = 150;
    const errors = await validate(dto);
    expect(errors.map(e => e.property)).toContain('decisionMakerScore');
  });
});
