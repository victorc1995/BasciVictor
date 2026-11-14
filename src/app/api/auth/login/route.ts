import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Senha não fornecida' }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const token = createSessionToken();
    const response = NextResponse.json({ success: true, message: 'Autenticado com sucesso' });

    // Define cookie de sessão seguro por 30 dias
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 dias
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno ao processar login' }, { status: 500 });
  }
}
