// supabase/functions/mercadopago/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    
    // 1. CRIA O CHECKOUT (COM O NOVO PREÇO)
    if (req.method === 'POST' && !url.searchParams.get('topic')) {
      const { user_id, email } = await req.json()

      const preference = {
        items: [
          {
            title: 'Tryly PRO - Assinatura Mensal',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 9.90, // <--- PREÇO ATUALIZADO AQUI
          },
        ],
        payer: { email: email },
        external_reference: user_id,
        back_urls: {
          success: 'https://tryly.com.br/app',
          failure: 'https://tryly.com.br/app',
          pending: 'https://tryly.com.br/app',
        },
        auto_return: 'approved',
        notification_url: `${url.origin}/functions/v1/mercadopago?topic=payment`,
        payment_methods: {
            excluded_payment_types: [
                { id: "ticket" } // Opcional: Remove boleto se quiser só Pix/Cartão (Boleto demora a compensar)
            ],
            installments: 1 // Opcional: Trava em 1x se não quiser parcelamento
        }
      }

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        },
        body: JSON.stringify(preference)
      })

      const data = await mpResponse.json()
      return new Response(JSON.stringify({ init_point: data.init_point }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. WEBHOOK (CONFIRMA O PAGAMENTO)
    if (url.searchParams.get('topic') === 'payment' || req.json().type === 'payment') {
        const id = url.searchParams.get('id') || (await req.json()).data.id

        const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        })
        const paymentData = await paymentRes.json()

        if (paymentData.status === 'approved') {
            const userId = paymentData.external_reference
            
            const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
            
            await supabaseAdmin
                .from('profiles')
                .update({ is_pro: true })
                .eq('id', userId)
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    return new Response('Not found', { status: 404 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})