using System.Collections.ObjectModel;
using System.ComponentModel;

public class FileSystemItem : INotifyPropertyChanged
{
    private bool _isSelected;
    public string Name { get; set; }
    public string RelativePath { get; set; }
    public bool IsDirectory { get; set; }
    public ObservableCollection<FileSystemItem> Children { get; set; }

    public bool IsSelected
    {
        get => _isSelected;
        set
        {
            if (_isSelected != value)
            {
                _isSelected = value;
                OnPropertyChanged(nameof(IsSelected));
            }
        }
    }

    public FileSystemItem(string name, string relativePath, bool isDirectory)
    {
        Name = name;
        RelativePath = relativePath;
        IsDirectory = isDirectory;
        Children = new ObservableCollection<FileSystemItem>();
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}