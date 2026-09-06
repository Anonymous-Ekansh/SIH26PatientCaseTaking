"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, FileText, FolderOpen, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { useTranslations } from "next-intl";

type ExtractedEntity = {
  entity_type: string;
  label: string;
  value?: string | null;
  unit?: string | null;
  ref_range?: string | null;
  is_abnormal: boolean;
};

type DocumentState = {
  id: string; // local random id during upload, or real db id
  name: string;
  status: "uploading" | "processing" | "done" | "failed";
  entities?: ExtractedEntity[];
  error?: string;
};

export default function DocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const t = useTranslations("Documents");
  
  // Use the env var, fallback to localhost for development
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchDocuments = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${apiUrl}/api/documents/by-patient/${session.user.id}`);
      if (!response.ok) {
        // If 404, it might just mean no active encounter or no patient record yet, which is fine, just show empty
        if (response.status === 404) {
           setDocuments([]);
           return;
        }
        throw new Error("Failed to fetch documents");
      }
      
      const data = await response.json();
      
      // Parse the response into our DocumentState format
      const formattedDocs: DocumentState[] = data.map((doc: any) => ({
        id: doc.id,
        name: doc.storage_path.split("/").pop() || "Document",
        status: doc.ocr_status === "processing" ? "processing" : doc.ocr_status === "failed" ? "failed" : "done",
        entities: doc.extracted_entities || [],
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, apiUrl]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = async (file: File, localId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Update UI to "processing" (meaning it's being sent to the backend)
      setDocuments(prev => prev.map(d => d.id === localId ? { ...d, status: "processing" } : d));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("auth_user_id", session.user.id);
      formData.append("doc_type", "other"); // Default to "other" as requested

      const response = await fetch(`${apiUrl}/api/documents/upload`, {
        method: "POST",
        body: formData,
        // Notice: do NOT set Content-Type here, the browser must set it with the multipart boundary automatically
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Upload failed");
      }

      const result = await response.json();
      
      // Update UI with success and the extracted entities
      setDocuments(prev => prev.map(d => d.id === localId ? { 
        ...d, 
        id: result.document_id,
        status: "done",
        entities: result.extracted_entities || []
      } : d));

    } catch (error: any) {
      console.error("Upload error:", error);
      setDocuments(prev => prev.map(d => d.id === localId ? { 
        ...d, 
        status: "failed",
        error: error.message || t('error_msg')
      } : d));
    }
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;

      const newDocs: DocumentState[] = selected.map((f) => ({
        id: Math.random().toString(36).substring(7),
        name: f.name,
        status: "uploading",
      }));

      // Add to top of list
      setDocuments((prev) => [...newDocs, ...prev]);

      // Start upload process for each file independently
      selected.forEach((file, index) => {
        uploadFile(file, newDocs[index].id);
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadFile]
  );

  const retryUpload = () => {
    // A full retry mechanism would require keeping the File object in memory.
    // For now, we prompt the user to select the file again.
    alert("Please tap 'upload a file' to select the document and try again.");
  }

  return (
    <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">{t('title')}</h1>
      <p className="text-[#6B7280] mb-8">
        {t('subtitle')}
      </p>

      {/* Drop zone */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-[#F5F5F5] border-2 border-dashed border-[#E5E7EB] hover:border-[#0EA5E9] rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors active:scale-[0.99] mb-8"
      >
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[#0EA5E9] mb-4 border border-[#E5E7EB]">
          <Camera size={32} />
        </div>
        <p className="text-lg font-bold text-[#1A1A1A] mb-1">
          {t('tap_upload')}
        </p>
        <p className="text-sm text-[#6B7280]">{t('support_text')}</p>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </button>

      {/* File list or empty state */}
      {isLoading ? (
        <div className="flex flex-col gap-3 opacity-50">
          <div className="bg-[#F5F5F5] rounded-xl p-4 border border-[#E5E7EB] h-16 animate-pulse"></div>
          <div className="bg-[#F5F5F5] rounded-xl p-4 border border-[#E5E7EB] h-16 animate-pulse"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-[#F5F5F5] rounded-2xl p-10 border border-[#E5E7EB] flex flex-col items-center justify-center">
          <FolderOpen size={48} className="text-[#E5E7EB] mb-4" />
          <p className="text-[#6B7280] font-medium">{t('no_docs')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#F5F5F5] rounded-xl p-4 border border-[#E5E7EB] flex flex-col gap-3 text-left transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                  {doc.status === "done" ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : doc.status === "failed" ? (
                    <AlertCircle size={20} className="text-red-500" />
                  ) : (
                    <FileText size={20} className="text-[#6B7280]" />
                  )}
                </div>
                
                <span className="text-sm font-medium text-[#1A1A1A] truncate flex-1">
                  {doc.name}
                </span>

                <span className={`text-xs font-semibold px-2 py-1 rounded-full border flex-shrink-0 flex items-center gap-1.5 ${
                  doc.status === "done" ? "bg-green-50 text-green-700 border-green-200" :
                  doc.status === "failed" ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-white text-[#6B7280] border-[#E5E7EB]"
                }`}>
                  {(doc.status === "uploading" || doc.status === "processing") && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  {doc.status === "uploading" ? t('uploading') :
                   doc.status === "processing" ? t('processing') :
                   doc.status === "done" ? t('done') : t('failed')}
                </span>
              </div>

              {/* Error State */}
              {doc.status === "failed" && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center justify-between border border-red-100">
                  <span>{doc.error || t('error_msg')}</span>
                  <button onClick={retryUpload} className="text-xs font-bold uppercase tracking-wider underline hover:text-red-800 transition-colors">
                    {t('retry')}
                  </button>
                </div>
              )}

              {/* Extracted Entities List */}
              {doc.status === "done" && doc.entities && doc.entities.length > 0 && (
                <div className="mt-2 bg-white rounded-lg border border-[#E5E7EB] overflow-hidden divide-y divide-[#E5E7EB]">
                  {doc.entities.map((ent, idx) => (
                    <div key={idx} className={`p-3 flex items-start justify-between text-sm transition-colors ${ent.is_abnormal ? "bg-amber-50" : "hover:bg-gray-50"}`}>
                      <div className="flex flex-col gap-0.5">
                        <span className={`font-semibold ${ent.is_abnormal ? "text-amber-900" : "text-[#1A1A1A]"}`}>
                          {ent.label}
                        </span>
                        <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-bold">
                          {ent.entity_type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex flex-col items-end text-right gap-0.5">
                        <span className={`font-bold ${ent.is_abnormal ? "text-amber-700" : "text-[#1A1A1A]"}`}>
                          {ent.value || "-"} {ent.unit || ""}
                        </span>
                        {ent.ref_range && (
                          <span className="text-[10px] text-[#6B7280] font-medium">
                            {t('ref')} {ent.ref_range}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
