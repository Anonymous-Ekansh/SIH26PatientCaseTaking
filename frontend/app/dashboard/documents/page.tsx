"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, FileText, FolderOpen } from "lucide-react";

type UploadedFile = {
  id: string;
  name: string;
};

export default function DocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;

      const newFiles = selected.map((f) => ({
        id: Math.random().toString(36).substring(7),
        name: f.name,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    []
  );

  return (
    <div className="max-w-[700px] mx-auto px-5 py-10 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Your documents</h1>
      <p className="text-[#6B7280] mb-8">
        Prescriptions, lab reports, or discharge summaries
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
          Tap to upload a file
        </p>
        <p className="text-sm text-[#6B7280]">Supports images and PDF documents</p>
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
      {files.length === 0 ? (
        <div className="bg-[#F5F5F5] rounded-2xl p-10 border border-[#E5E7EB] flex flex-col items-center justify-center">
          <FolderOpen size={48} className="text-[#E5E7EB] mb-4" />
          <p className="text-[#6B7280] font-medium">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-[#F5F5F5] rounded-xl p-4 border border-[#E5E7EB] flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 bg-white rounded-lg border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-[#6B7280]" />
              </div>
              <span className="text-sm font-medium text-[#1A1A1A] truncate flex-1">
                {file.name}
              </span>
              <span className="text-xs font-semibold text-[#6B7280] bg-white px-2 py-1 rounded-full border border-[#E5E7EB] flex-shrink-0">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
