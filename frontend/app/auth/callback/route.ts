import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/onboarding/details'

  if (code) {
    const supabase = await createClient()
    const { error, data: authData } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && authData?.session?.user) {
      const user = authData.session.user;
      
      // Determine where to route them based on if they are a patient or doctor
      let finalNext = next;
      if (next === '/onboarding/details' || next === '/') {
        // Check patients first
        const { data: patient } = await supabase
          .from("patients")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();
          
        if (patient) {
          finalNext = '/dashboard';
        } else {
          // Check doctors
          const { data: doctor } = await supabase
            .from("doctors")
            .select("id")
            .eq("auth_user_id", user.id)
            .single();
            
          if (doctor) {
            finalNext = '/doctor/dashboard';
          } else {
            finalNext = '/onboarding/details';
          }
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${finalNext}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${finalNext}`)
      } else {
        return NextResponse.redirect(`${origin}${finalNext}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
