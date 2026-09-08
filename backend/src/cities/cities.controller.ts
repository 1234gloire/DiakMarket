import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Public } from '../common/decorators/public.decorator.js';
import { CitiesService } from './cities.service.js';

class FindCitiesQuery {
  @IsUUID()
  countryId!: string;
}

@ApiTags('cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Public()
  @Get()
  findAll(@Query() query: FindCitiesQuery) {
    return this.citiesService.findByCountry(query.countryId);
  }
}
