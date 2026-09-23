import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Get('me')
  async getMe(@GetUser() user: any) {
    const dbUser = await this.usersService.findById(user.userId);
    if (!dbUser) throw new UnauthorizedException('User not found');
    const { passwordHash, refreshToken, ...result } = dbUser;
    return {
      success: true,
      data: { user: result },
      message: 'User profile fetched successfully'
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto.email, loginDto.password);
    return {
      success: true,
      data: result,
      message: 'Login successful'
    };
  }

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() registerDto: any) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        data: result,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('activate')
  async activate(@Body() activateAccountDto: any) {
    const result = await this.authService.activateAccount(activateAccountDto.token, activateAccountDto.password);
    return {
      success: true,
      data: result,
      message: 'Account activated successfully'
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    const result = await this.authService.refreshTokens(refreshToken);
    return {
      success: true,
      data: result,
      message: 'Tokens refreshed successfully'
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@GetUser() user: any) {
    await this.authService.logout(user.userId);
    return {
      success: true,
      message: 'Logged out successfully'
    };
  }
}
