// src/mail/mail.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { EnviarEmailDto } from './dto/email.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async sendMail(@Body() dto: EnviarEmailDto) {
    return this.mailService.sendEmail(dto);
  }
}
