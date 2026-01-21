import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { CompetencyService } from './competency.service';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { QueryCompetencyDto } from './dto/query-competency.dto';
import { DeprecateCompetencyDto } from './dto/deprecate-competency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('competencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompetencyController {
  constructor(private readonly competencyService: CompetencyService) {}

  /**
   * Create a new competency (BITFLOW_OWNER only)
   * POST /api/competencies
   */
  @Post()
  @Roles(UserRole.BITFLOW_OWNER)
  create(@Body() createDto: CreateCompetencyDto, @CurrentUser('userId') userId: string) {
    return this.competencyService.create(createDto, userId);
  }

  /**
   * Get all competencies with filtering
   * GET /api/competencies
   */
  @Get()
  findAll(@Query() query: QueryCompetencyDto) {
    return this.competencyService.findAll(query);
  }

  /**
   * Get available subjects for filtering
   * GET /api/competencies/subjects
   */
  @Get('subjects')
  getSubjects() {
    return this.competencyService.getSubjects();
  }

  /**
   * Get competency statistics
   * GET /api/competencies/stats
   */
  @Get('stats')
  @Roles(UserRole.BITFLOW_OWNER)
  getStats() {
    return this.competencyService.getStats();
  }

  /**
   * Get competency by ID
   * GET /api/competencies/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competencyService.findOne(id);
  }

  /**
   * Review competency (BITFLOW_OWNER only)
   * PATCH /api/competencies/:id
   */
  @Patch(':id')
  @Roles(UserRole.BITFLOW_OWNER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCompetencyDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.competencyService.update(id, updateDto, userId);
  }

  /**
   * Activate a competency (makes it immutable)
   * PATCH /api/competencies/:id/activate
   */
  @Patch(':id/activate')
  @Roles(UserRole.BITFLOW_OWNER)
  activate(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.competencyService.activate(id, userId);
  }

  /**
   * Deprecate a competency
   * PATCH /api/competencies/:id/deprecate
   */
  @Patch(':id/deprecate')
  @Roles(UserRole.BITFLOW_OWNER)
  deprecate(
    @Param('id') id: string,
    @Body() deprecateDto: DeprecateCompetencyDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.competencyService.deprecate(id, deprecateDto, userId);
  }
}
