import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Version: 2.0.1 - Force redeploy
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, servicesUrl, username, password, accessToken, resource, permission } = await req.json();

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

    if (action === 'checkAccess') {
      if (!accessToken || !servicesUrl || !resource || !permission) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: accessToken, servicesUrl, resource, permission' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`CheckAccess: resource=${resource}, permission=${permission}`);
      console.log(`Using token (first 10 chars): ${accessToken.substring(0, 10)}...`);
      
      const checkAccessUrl = `${servicesUrl}platform/authorization/queries/checkAccess`;
      console.log(`CheckAccess URL: ${checkAccessUrl}`);

      // Use Bearer token
      const checkAccessResponse = await fetch(checkAccessUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: [
            {
              resource,
              action: permission,
            }
          ],
        }),
      });

      console.log(`CheckAccess response status: ${checkAccessResponse.status}`);

      if (!checkAccessResponse.ok) {
        const errorText = await checkAccessResponse.text().catch(() => '');
        console.error(`CheckAccess failed: ${errorText}`);
        
        // Generate curl command for debugging
        const curlBody = JSON.stringify({
          permissions: [{ resource, action: permission }]
        });
        const curlCommand = `curl -X POST '${checkAccessUrl}' -H 'Authorization: Bearer ${accessToken}' -H 'Content-Type: application/json' -d '${curlBody}'`;
        console.log(`CURL DEBUG:\n${curlCommand}`);

        return new Response(
          JSON.stringify({
            error: 'Failed to check access',
            details: errorText,
            hasAccess: false,
            curlCommand,
          }),
          { status: checkAccessResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accessData = await checkAccessResponse.json();
      console.log('CheckAccess successful:', JSON.stringify(accessData));

      // Check for various response formats from Senior API
      const hasAccess = accessData.ok === true || 
                       accessData.allowed === true || 
                       accessData.authorized === true ||
                       (Array.isArray(accessData.permissions) && accessData.permissions.some((p: any) => p.allowed === true || p.authorized === true));

      // Build the request payload for debugging
      const requestPayload = {
        permissions: [
          {
            resource,
            action: permission,
          }
        ],
      };

      return new Response(
        JSON.stringify({ 
          hasAccess,
          raw: accessData,
          request: requestPayload,
          response: accessData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "login", "getUser", or "checkAccess"' }),
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
