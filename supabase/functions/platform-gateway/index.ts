import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, servicesUrl, username, password, accessToken } = await req.json();

    console.log(`Platform Gateway: action=${action}, servicesUrl=${servicesUrl}`);

    if (action === 'login') {
      if (!username || !password || !servicesUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: username, password, servicesUrl' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const loginResponse = await fetch(`${servicesUrl}platform/authentication/actions/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log(`Login response status: ${loginResponse.status}`);

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error(`Login failed: ${errorText}`);
        return new Response(
          JSON.stringify({ error: 'Authentication failed', details: errorText }),
          { status: loginResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const loginData = await loginResponse.json();
      console.log('Login successful');

      return new Response(
        JSON.stringify(loginData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getUser') {
      if (!accessToken || !servicesUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: accessToken, servicesUrl' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userResponse = await fetch(`${servicesUrl}platform/user/queries/getUser`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log(`GetUser response status: ${userResponse.status}`);

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error(`GetUser failed: ${errorText}`);
        return new Response(
          JSON.stringify({ error: 'Failed to get user data', details: errorText }),
          { status: userResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userData = await userResponse.json();
      console.log('GetUser successful');

      return new Response(
        JSON.stringify(userData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "login" or "getUser"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Platform Gateway error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
