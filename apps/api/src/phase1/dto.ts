import { ApiProperty, PartialType } from '@nestjs/swagger'
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'pessoa@empresa.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'Pessoa NEXO' })
  @IsString()
  @Length(2, 160)
  name!: string

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128)
  password!: string
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  password!: string
}

export class VerifyEmailDto {
  @IsString()
  token!: string
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string
}

export class ResetPasswordDto {
  @IsString()
  token!: string

  @IsString()
  @Length(12, 128)
  password!: string
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string

  @IsString()
  @Length(12, 128)
  nextPassword!: string
}

export class CreateOrganizationDto {
  @IsString()
  @Length(2, 160)
  name!: string

  @IsOptional()
  @IsString()
  @Length(3, 80)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string
}

export class InvitationDto {
  @IsEmail()
  email!: string

  @IsUUID()
  roleId!: string
}

export class UpdateMembershipDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED'

  @IsOptional()
  @IsUUID()
  roleId?: string
}

export class CreateTeamDto {
  @IsString()
  @Length(2, 120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsUUID()
  leaderMembershipId?: string
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class AddTeamMemberDto {
  @IsUUID()
  membershipId!: string
}

export class CreateContactDto {
  @IsString()
  @Length(2, 160)
  name!: string
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() @MaxLength(40) phone?: string
  @IsOptional() @IsString() @MaxLength(160) company?: string
  @IsOptional() @IsString() @MaxLength(80) source?: string
}

export class CreateInboxDto {
  @IsString() @Length(2, 120) name!: string
}
export class SimulateMessageDto {
  @IsString() @Length(2, 160) contactName!: string
  @IsString() @Length(3, 255) identifier!: string
  @IsString() @Length(1, 8_000) body!: string
}
export class SendMessageDto {
  @IsString() @Length(1, 8_000) body!: string
}
export class UpdateConversationDto {
  @IsOptional() @IsIn(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']) status?:
    | 'OPEN'
    | 'PENDING'
    | 'RESOLVED'
    | 'CLOSED'
  @IsOptional() @IsUUID() assigneeMembershipId?: string
  @IsOptional() @IsUUID() teamId?: string
}
export class CreateTagDto {
  @IsString() @Length(1, 80) name!: string
  @IsOptional() @IsString() @MaxLength(32) color?: string
}
export class CreateNoteDto {
  @IsString() @Length(1, 8_000) body!: string
}
