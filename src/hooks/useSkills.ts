import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatform } from '@/contexts/PlatformContext';
import { toast } from '@/hooks/use-toast';

export interface Skill {
  id: string;
  name: string;
  validated: boolean;
}

export interface UserSkill {
  id: string;
  skillId: string;
  skillName: string;
  proficiency: number;
  validated: boolean;
}

export function useSkills() {
  const { tenantName, userName, isLoaded } = usePlatform();
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's skills
  const fetchUserSkills = useCallback(async () => {
    if (!tenantName || !userName) {
      console.log('No tenant or user, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching skills for:', { tenantName, userName });

      const { data, error: fetchError } = await supabase
        .from('user_skills')
        .select(`
          id,
          proficiency,
          skill_id,
          skills (
            id,
            name,
            validated
          )
        `)
        .eq('tenant_name', tenantName)
        .eq('user_id', userName);

      if (fetchError) {
        throw fetchError;
      }

      const mappedSkills: UserSkill[] = (data || []).map((item: any) => ({
        id: item.id,
        skillId: item.skill_id,
        skillName: item.skills?.name || '',
        proficiency: item.proficiency,
        validated: item.skills?.validated || false,
      }));

      console.log('Fetched skills:', mappedSkills);
      setUserSkills(mappedSkills);
    } catch (err) {
      console.error('Error fetching skills:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    } finally {
      setIsLoading(false);
    }
  }, [tenantName, userName]);

  // Add a skill
  const addSkill = useCallback(async (skillName: string, proficiency: number) => {
    if (!tenantName || !userName) {
      toast({
        title: "Erro",
        description: "Contexto da plataforma não carregado",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      // First, check if skill exists or create it
      let { data: existingSkill } = await supabase
        .from('skills')
        .select('id, validated')
        .eq('tenant_name', tenantName)
        .eq('name', skillName)
        .maybeSingle();

      let skillId: string;
      let validated: boolean;

      if (existingSkill) {
        skillId = existingSkill.id;
        validated = existingSkill.validated;
      } else {
        // Create new skill (not validated by default)
        const { data: newSkill, error: createError } = await supabase
          .from('skills')
          .insert({
            tenant_name: tenantName,
            name: skillName,
            validated: false,
          })
          .select('id, validated')
          .single();

        if (createError) throw createError;
        skillId = newSkill.id;
        validated = newSkill.validated;
      }

      // Check if user already has this skill
      const { data: existingUserSkill } = await supabase
        .from('user_skills')
        .select('id')
        .eq('tenant_name', tenantName)
        .eq('user_id', userName)
        .eq('skill_id', skillId)
        .maybeSingle();

      if (existingUserSkill) {
        toast({
          title: "Habilidade já cadastrada",
          description: `Você já possui "${skillName}" nas suas habilidades`,
          variant: "destructive",
        });
        return false;
      }

      // Add user skill
      const { data: userSkill, error: addError } = await supabase
        .from('user_skills')
        .insert({
          tenant_name: tenantName,
          user_id: userName,
          skill_id: skillId,
          proficiency,
        })
        .select('id')
        .single();

      if (addError) throw addError;

      // Update local state
      setUserSkills(prev => [...prev, {
        id: userSkill.id,
        skillId,
        skillName,
        proficiency,
        validated,
      }]);

      toast({
        title: "Habilidade adicionada",
        description: `${skillName} foi adicionada com proficiência ${proficiency}`,
      });

      return true;
    } catch (err) {
      console.error('Error adding skill:', err);
      toast({
        title: "Erro ao adicionar habilidade",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantName, userName]);

  // Update proficiency
  const updateProficiency = useCallback(async (userSkillId: string, proficiency: number) => {
    if (!tenantName) return false;

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('user_skills')
        .update({ proficiency })
        .eq('id', userSkillId)
        .eq('tenant_name', tenantName);

      if (updateError) throw updateError;

      // Update local state
      setUserSkills(prev => prev.map(skill => 
        skill.id === userSkillId ? { ...skill, proficiency } : skill
      ));

      const skillName = userSkills.find(s => s.id === userSkillId)?.skillName;
      toast({
        title: "Proficiência atualizada",
        description: `${skillName} atualizada para nível ${proficiency}`,
      });

      return true;
    } catch (err) {
      console.error('Error updating proficiency:', err);
      toast({
        title: "Erro ao atualizar proficiência",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantName, userSkills]);

  // Delete skill
  const deleteSkill = useCallback(async (userSkillId: string) => {
    if (!tenantName) return false;

    setIsLoading(true);

    try {
      const skillName = userSkills.find(s => s.id === userSkillId)?.skillName;

      const { error: deleteError } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', userSkillId)
        .eq('tenant_name', tenantName);

      if (deleteError) throw deleteError;

      // Update local state
      setUserSkills(prev => prev.filter(skill => skill.id !== userSkillId));

      toast({
        title: "Habilidade removida",
        description: `${skillName} foi removida das suas habilidades`,
      });

      return true;
    } catch (err) {
      console.error('Error deleting skill:', err);
      toast({
        title: "Erro ao remover habilidade",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantName, userSkills]);

  // Fetch on platform load
  useEffect(() => {
    if (isLoaded && tenantName && userName) {
      fetchUserSkills();
    }
  }, [isLoaded, tenantName, userName, fetchUserSkills]);

  return {
    userSkills,
    isLoading,
    error,
    addSkill,
    updateProficiency,
    deleteSkill,
    refetch: fetchUserSkills,
  };
}
