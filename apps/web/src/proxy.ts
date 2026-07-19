import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.has('nexo_access')) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/app/:path*',
    '/dashboard/:path*',
    '/inbox/:path*',
    '/crm/:path*',
    '/ai/:path*',
    '/workflows/:path*',
    '/knowledge/:path*',
    '/analytics/:path*',
    '/integrations/:path*',
    '/team/:path*',
    '/settings/:path*',
  ],
}
