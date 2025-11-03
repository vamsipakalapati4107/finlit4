import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  content: string;
  order_index: number;
  xp_reward: number;
  estimated_minutes: number;
}

export default function LessonDetail() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLesson();
  }, [courseId, lessonId]);

  const loadLesson = async () => {
    if (!courseId || !lessonId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .eq('course_id', courseId)
        .single();
      if (error) throw error;
      if (!data) {
        toast.error('Lesson not found');
        navigate(`/course/${courseId}`);
        return;
      }
      if (!data.content || data.content.trim() === '') {
        // Attempt generation once here as a fallback
        const { data: gen, error: genErr } = await supabase.functions.invoke('generate-lesson', {
          body: { lessonId, courseId, title: data.title }
        });
        if (!genErr) {
          const payload = gen as any;
          const content = (payload?.content ?? payload?.lesson) as string | undefined;
          if (content && content.trim() !== '') {
            setLesson({ ...data, content });
          } else {
            setLesson(data as Lesson);
          }
        } else {
          setLesson(data as Lesson);
        }
      } else {
        setLesson(data as Lesson);
      }
    } catch (e) {
      toast.error('Failed to load lesson');
      navigate(`/course/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(`/course/${courseId}`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>

        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
          <div className="prose max-w-none whitespace-pre-wrap">
            {lesson.content || 'No content yet.'}
          </div>
        </Card>
      </div>
    </div>
  );
}


