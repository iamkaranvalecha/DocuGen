internal class FileSection
{
    public string FileName { get; set; }
    public string FilePath { get; set; }
    public string Section { get; set; }
    public bool ToBeAnalysed { get; set; }
    public bool AppendAtEnd { get; set; }
}