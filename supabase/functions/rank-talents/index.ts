import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequiredSkill {
  name: string;
  proficiency: number;
}

interface UserSkillMatch {
  skillName: string;
  requiredProficiency: number;
  userProficiency: number;
}

interface RankedUser {
  userId: string;
  userName: string;
  fullName: string;
  matchScore: number;
  matchedSkills: UserSkillMatch[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantName, requiredSkills } = await req.json();

    if (!tenantName || !requiredSkills || requiredSkills.length === 0) {
      return new Response(
        JSON.stringify({ error: "tenantName and requiredSkills are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users for the tenant
    const { data: users, error: usersError } = await supabase
      .from("tenant_users")
      .select("id, user_name, full_name")
      .eq("tenant_name", tenantName);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ rankedUsers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all skills for the tenant that match required skills (case-insensitive)
    const skillNames = requiredSkills.map((s: RequiredSkill) => s.name.toLowerCase());
    
    const { data: skills, error: skillsError } = await supabase
      .from("skills")
      .select("id, name")
      .eq("tenant_name", tenantName);

    if (skillsError) throw skillsError;

    // Map skill names to IDs (case-insensitive matching)
    const skillNameToId: Record<string, string> = {};
    const skillIdToName: Record<string, string> = {};
    
    (skills || []).forEach((skill) => {
      const lowerName = skill.name.toLowerCase();
      if (skillNames.includes(lowerName)) {
        skillNameToId[lowerName] = skill.id;
        skillIdToName[skill.id] = skill.name;
      }
    });

    const matchingSkillIds = Object.values(skillNameToId);

    if (matchingSkillIds.length === 0) {
      return new Response(
        JSON.stringify({ rankedUsers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user_skills for matching skills
    const { data: userSkills, error: userSkillsError } = await supabase
      .from("user_skills")
      .select("user_id, skill_id, proficiency")
      .eq("tenant_name", tenantName)
      .in("skill_id", matchingSkillIds);

    if (userSkillsError) throw userSkillsError;

    // Build user skill map
    const userSkillMap: Record<string, Record<string, number>> = {};
    (userSkills || []).forEach((us) => {
      if (!userSkillMap[us.user_id]) {
        userSkillMap[us.user_id] = {};
      }
      const skillName = skillIdToName[us.skill_id];
      if (skillName) {
        userSkillMap[us.user_id][skillName.toLowerCase()] = us.proficiency;
      }
    });

    // Calculate scores for each user
    const rankedUsers: RankedUser[] = [];

    for (const user of users) {
      // Use user_name instead of UUID id since user_skills.user_id stores the username
      const userSkillData = userSkillMap[user.user_name] || {};
      const matchedSkills: UserSkillMatch[] = [];
      let totalScore = 0;
      let maxPossibleScore = 0;

      for (const required of requiredSkills as RequiredSkill[]) {
        const requiredName = required.name.toLowerCase();
        const userProficiency = userSkillData[requiredName] || 0;
        
        if (userProficiency > 0) {
          matchedSkills.push({
            skillName: required.name,
            requiredProficiency: required.proficiency,
            userProficiency,
          });
          
          // Score calculation: ratio of user proficiency to required, capped at 1
          const skillScore = Math.min(userProficiency / required.proficiency, 1);
          totalScore += skillScore * required.proficiency; // Weight by importance
        }
        
        maxPossibleScore += required.proficiency;
      }

      // Only include users who have at least one matching skill
      if (matchedSkills.length > 0) {
        const matchScore = (totalScore / maxPossibleScore) * 100;
        
        rankedUsers.push({
          userId: user.id,
          userName: user.user_name,
          fullName: user.full_name || user.user_name,
          matchScore,
          matchedSkills,
        });
      }
    }

    // Sort by match score descending
    rankedUsers.sort((a, b) => b.matchScore - a.matchScore);

    return new Response(
      JSON.stringify({ rankedUsers: rankedUsers.slice(0, 20) }), // Top 20
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in rank-talents:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
