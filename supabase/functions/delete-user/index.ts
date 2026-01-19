import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Trata requisições OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    if (!user_id) throw new Error('ID do usuário obrigatório')

    // Cria o cliente ADMIN (com poder total)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Deleta o Usuário do Authentication (Isso impede o login para sempre)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authError) throw authError

    // 2. (Opcional) Deleta o perfil do banco se o Cascade não tiver funcionado
    // Geralmente o Supabase deleta o perfil sozinho quando o Auth é deletado, mas garantimos aqui.
    await supabaseAdmin.from('profiles').delete().eq('id', user_id)

    return new Response(JSON.stringify({ message: 'Usuário deletado com sucesso' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})