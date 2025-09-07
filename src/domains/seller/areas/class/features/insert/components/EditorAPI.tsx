import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Editor } from '@toast-ui/react-editor';
import type { Editor as EditorType } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import 'tui-color-picker/dist/tui-color-picker.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';
import '@toast-ui/editor/dist/i18n/ko-kr';

export interface EditorHandle {
  setMarkdown: (v: string) => void;
  getMarkdown: () => string;
  getHTML: () => string;
}

type Props = {
  initialValue?: string;
  /** 에디터에 로컬 이미지가 추가될 때: blobURL과 File을 부모에게 넘겨줌 */
  onLocalImageAdded?: (url: string, file: File) => void;
};

const EditorAPI = forwardRef<EditorHandle, Props>(
  ({ initialValue = '', onLocalImageAdded }, ref) => {
    const editorRef = useRef<EditorType | null>(null);

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
        language="ko-KR"
        initialValue={initialValue}
        toolbarItems={[
          ['heading', 'bold', 'italic', 'strike'],
          ['hr', 'quote'],
          ['ul', 'ol', 'task'],
          ['table', 'image', 'link'],
          ['code', 'codeblock'],
        ]}
        hooks={{
          // TOAST UI가 요구하는 콜백 시그니처 그대로 명시
          addImageBlobHook: async (
            blob: Blob | File,
            callback: (url: string, altText?: string) => void
          ) => {
            // 1) 에디터에는 즉시 blob URL로 미리보기
            const objectUrl = URL.createObjectURL(blob);
            callback(objectUrl, '');

            // 2) 부모에게 파일 전달(저장 시 업로드 용)
            if (blob instanceof File) onLocalImageAdded?.(objectUrl, blob);
          },
        }}
      />
    );
  }
);

export default EditorAPI;
