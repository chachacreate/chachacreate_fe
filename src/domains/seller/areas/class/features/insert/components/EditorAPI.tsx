import { forwardRef, useImperativeHandle, useRef } from 'react';
import '@toast-ui/editor/dist/toastui-editor.css';
import { Editor } from '@toast-ui/react-editor';
import type { Editor as EditorType } from '@toast-ui/react-editor';

import colorSyntax from '@toast-ui/editor-plugin-color-syntax';
import 'tui-color-picker/dist/tui-color-picker.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import '@toast-ui/editor/dist/i18n/ko-kr';

import api from '@src/libs/apiService';

export interface EditorHandle {
  setMarkdown: (v: string) => void;
  getMarkdown: () => string;
  getHTML: () => string;
}

type Props = {
  initialValue?: string;
  onImageUploaded?: (url: string, desc?: string) => void;
};

const EditorAPI = forwardRef<EditorHandle, Props>((props, ref) => {
  // ✅ 내부 ref는 1개만
  const editorRef = useRef<EditorType | null>(null);
  const { initialValue = '', onImageUploaded } = props;

  // ✅ 외부로 내보낼 메서드
  useImperativeHandle(ref, () => ({
    setMarkdown: (v: string) => editorRef.current?.getInstance().setMarkdown(v || ''),
    getMarkdown: () => editorRef.current?.getInstance().getMarkdown() || '',
    getHTML: () => editorRef.current?.getInstance().getHTML() || '',
  }));

  return (
    <Editor
      ref={editorRef}
      height="500px"
      initialEditType="wysiwyg"
      hideModeSwitch
      plugins={[colorSyntax]}
      language="ko-kr"
      initialValue={initialValue}
      toolbarItems={[
        // 원하는 툴바만 지정
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol', 'task'],
        ['table', 'image', 'link'],
        ['code', 'codeblock'],
      ]}
      hooks={{
        // 타입 안정: Blob | File, alt는 선택값
        addImageBlobHook: async (
          blob: Blob | File,
          callback: (url: string, alt?: string) => void
        ) => {
          try {
            const fd = new FormData();
            fd.append('file', blob);

            const resp = await api.post('/files/upload', fd);
            const url = resp.data?.url;
            if (!url) throw new Error('업로드 URL 없음');

            callback(url, '');
            onImageUploaded?.(url);
          } catch (e: any) {
            alert(e?.response?.data?.message || e?.message || '이미지 업로드 실패');
          }
        },
      }}
    />
  );
});

export default EditorAPI;
