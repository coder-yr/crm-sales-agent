import { validate } from 'class-validator';
import { CreateSignalDto } from './signal.dto';

describe('Signal DTO Validation', () => {
  it('should invalidate confidence > 100', async () => {
    const dto = new CreateSignalDto();
    dto.companyId = 'c1';
    dto.type = 'WEB_VISIT';
    dto.title = 'Visit';
    dto.source = 'Website';
    dto.strength = 50;
    dto.confidence = 110;
    
    const errors = await validate(dto);
    expect(errors.map(e => e.property)).toContain('confidence');
  });

  it('should invalidate strength < 0', async () => {
    const dto = new CreateSignalDto();
    dto.companyId = 'c1';
    dto.type = 'WEB_VISIT';
    dto.title = 'Visit';
    dto.source = 'Website';
    dto.strength = -10;
    dto.confidence = 90;
    
    const errors = await validate(dto);
    expect(errors.map(e => e.property)).toContain('strength');
  });

  it('should invalidate invalid URL', async () => {
    const dto = new CreateSignalDto();
    dto.companyId = 'c1';
    dto.type = 'WEB_VISIT';
    dto.title = 'Visit';
    dto.source = 'Website';
    dto.strength = 50;
    dto.confidence = 90;
    dto.sourceUrl = 'invalid-url';
    
    const errors = await validate(dto);
    expect(errors.map(e => e.property)).toContain('sourceUrl');
  });
});
