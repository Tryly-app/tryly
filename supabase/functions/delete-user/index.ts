import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Use o nome exato que você definiu no painel (MY_SERVICE_ROLE_KEY)
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('MYY_SERVICE_ROLE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) throw new Error('ID do usuário obrigatório')

    // Cria o cliente com Super Poderes
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // --- FAXINA PREVENTIVA ---
    // Deleta os dados das tabelas públicas PRIMEIRO para liberar o usuário
    // O banco não vai reclamar se a gente apagar os dados dependentes antes.
    
    // 1. Apaga reflexões
    await supabaseAdmin.from('reflections').delete().eq('user_id', user_id)
    
    // 2. Apaga progresso
    await supabaseAdmin.from('user_progress').delete().eq('user_id', user_id)
    
    // 3. Apaga amizades (onde ele é o dono OU o amigo)
    await supabaseAdmin.from('friendships').delete().or(`user_id.eq.${user_id},friend_id.eq.${user_id}`)
    
    // 4. Apaga o perfil
    await supabaseAdmin.from('profiles').delete().eq('id', user_id)

    // --- O GRAND FINALE ---
    // Agora que o usuário não tem mais nada prendendo ele, deletamos o Login
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    
    if (authError) {
        console.error("Erro Auth:", authError)
        throw authError
    }

    return new Response(JSON.stringify({ message: 'Usuário exterminado com sucesso' }), {
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