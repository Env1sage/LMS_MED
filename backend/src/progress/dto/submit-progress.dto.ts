import { IsUUID, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class SubmitProgressDto {
  /**
   * ID of the learning flow step being completed
   */
  @IsString()
  learning_flow_stepsId: string;

  /**
   * Completion percentage (0-100)
   */
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercent: number;

  /**
   * Time spent on the step in seconds
   */
  @IsOptional()
  @IsNumber()
  timeSpent?: number;

  /**
   * Optional notes or feedback from student
   */
  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Assessment score if applicable (e.g., for MCQs)
   */
  @IsOptional()
  @IsNumber()
  score?: number;
}
