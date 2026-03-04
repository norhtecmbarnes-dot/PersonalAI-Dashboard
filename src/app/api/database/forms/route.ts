export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import fs from 'fs';
import path from 'path';

const FORMS_FILE = path.join(process.cwd(), 'data', 'db-forms.json');

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormData {
  id: string;
  name: string;
  tableName: string;
  fields: FormField[];
  createdAt: number;
}

function loadForms(): FormData[] {
  try {
    if (fs.existsSync(FORMS_FILE)) {
      const data = fs.readFileSync(FORMS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading forms:', e);
  }
  return [];
}

function saveForms(forms: FormData[]): void {
  const dataDir = path.dirname(FORMS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(FORMS_FILE, JSON.stringify(forms, null, 2));
}

export async function GET(request: NextRequest) {
  try {
    const forms = loadForms();
    return NextResponse.json({ success: true, forms });
  } catch (error) {
    console.error('Failed to load forms:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, form, formId } = body;

    const forms = loadForms();

    switch (action) {
      case 'save':
        if (!form.name || !form.tableName || !form.fields) {
          return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        
        // Check if updating existing form
        const existingIndex = forms.findIndex(f => f.id === form.id);
        if (existingIndex >= 0) {
          forms[existingIndex] = { ...forms[existingIndex], ...form };
        } else {
          forms.push(form);
        }
        
        saveForms(forms);
        return NextResponse.json({ success: true, form: form });

      case 'delete':
        if (!formId) {
          return NextResponse.json({ success: false, error: 'formId required' }, { status: 400 });
        }
        
        const filtered = forms.filter(f => f.id !== formId);
        saveForms(filtered);
        return NextResponse.json({ success: true });

      case 'get':
        if (!formId) {
          return NextResponse.json({ success: false, error: 'formId required' }, { status: 400 });
        }
        
        const found = forms.find(f => f.id === formId);
        return NextResponse.json({ success: true, form: found || null });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to save form:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}