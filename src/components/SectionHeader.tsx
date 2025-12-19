interface SectionHeaderProps {
  title: string;
  logoUrl?: string;
  logoAlt?: string;
}

export default function SectionHeader({ title, logoUrl, logoAlt }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {logoUrl && (
        <img
          src={logoUrl}
          alt={logoAlt || `${title} logo`}
          className="w-8 h-8 object-contain"
        />
      )}
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

