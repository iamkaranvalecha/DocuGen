using DocuGen.Interfaces;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;

namespace DocuGen
{
    public partial class DocuGenToolWindowControl : UserControl
    {
        private ObservableCollection<FileSystemItem> rootItems;
        private readonly ICoreLogic _core;

        public DocuGenToolWindowControl(ICoreLogic core)
        {
            InitializeComponent();
            ModelProviderComboBox.ItemsSource = new List<string> { "AzureOpenAI", "Ollama" };
            _core = core;
        }

        private async Task GetFiles_Async()
        {
            var solution = await VS.Solutions.GetCurrentSolutionAsync();
            var projects = await VS.Solutions.GetAllProjectsAsync(ProjectStateFilter.All);

            if (projects == null || !projects.Any())
            {
                await VS.MessageBox.ShowAsync("DocuGenToolWindowControl", "No project found");
                return;
            }

            rootItems = new ObservableCollection<FileSystemItem>();

            foreach (var project in projects.Where(x => x.Type == SolutionItemType.Project))
            {
                var children = project.Children.Where(x => x.Type == SolutionItemType.PhysicalFolder || x.Type == SolutionItemType.PhysicalFile);

                if (children.Any())
                {
                    var projectItem = new FileSystemItem(project.Name, project.Name, true);
                    rootItems.Add(projectItem);
                    TraverseProjectItems(project, projectItem, project.Name);
                }
            }

            AllFilesTreeView.ItemsSource = rootItems;

            await VS.StatusBar.ShowMessageAsync("Files loaded");
        }

        string GetRelativePath(string basePath, string targetPath)
        {
            string[] baseParts = basePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            string[] targetParts = targetPath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

            int commonPrefixLength = 0;
            int minLength = Math.Min(baseParts.Length, targetParts.Length);

            for (int i = 0; i < minLength; i++)
            {
                if (string.Equals(baseParts[i], targetParts[i], StringComparison.OrdinalIgnoreCase))
                {
                    commonPrefixLength++;
                }
                else
                {
                    break;
                }
            }

            if (commonPrefixLength == 0)
            {
                return targetPath; // No common prefix, return full target path
            }

            var relativeParts = new List<string>();
            for (int i = commonPrefixLength; i < baseParts.Length; i++)
            {
                relativeParts.Add("..");
            }

            for (int i = commonPrefixLength; i < targetParts.Length; i++)
            {
                relativeParts.Add(targetParts[i]);
            }

            return string.Join(Path.DirectorySeparatorChar.ToString(), relativeParts);
        }

        async void TraverseProjectItems(SolutionItem project, FileSystemItem parentItem, string parentPath)
        {
            try
            {
                if (project.Type == SolutionItemType.Project ||
                    project.Type == SolutionItemType.PhysicalFile ||
                    project.Type == SolutionItemType.PhysicalFolder)
                {
                    var children = project.Children;

                    if (children == null)
                    {
                        return;
                    }

                    foreach (var child in children.Where(x => x.Type == SolutionItemType.PhysicalFolder || x.Type == SolutionItemType.PhysicalFile))
                    {
                        string relativePath = GetRelativePath(parentPath, child.Text);
                        FileSystemItem fileItem;

                        if (child.Type == SolutionItemType.PhysicalFile)
                        {
                            fileItem = new FileSystemItem(child.Name, relativePath, false);
                        }
                        else // PhysicalFolder
                        {
                            fileItem = new FileSystemItem(child.Name, relativePath, true);
                            TraverseProjectItems(child, fileItem, relativePath);
                        }

                        // Add the newly created item to the parent's Children collection
                        parentItem.Children.Add(fileItem);
                    }
                }
            }
            catch (Exception ex)
            {
                await VS.MessageBox.ShowErrorAsync("Error Traversing Items", ex.Message);
            }
        }

        private async void StageItem_ClickAsync(object sender, RoutedEventArgs e)
        {

        }

        private async void OpenFile_ClickAsync(object sender, RoutedEventArgs e)
        {

        }

        private async void GenerateDocumentation_ClickAsync(object sender, RoutedEventArgs e)
        {
            await VS.MessageBox.ShowAsync("DocuGen", "Generate Button clicked");
        }

        private async void StageAll_ClickAsync(object sender, RoutedEventArgs e)
        {
            await GetFiles_Async();

            StagedFilesTreeView.ItemsSource = AllFilesTreeView.Items;

            var result = await _core.GenerateDocumentationAsync("", [], [], [], "", "", "", "", ModelProviderEnums.AzureOpenAI);

            await VS.MessageBox.ShowAsync("DocuGen", result);
        }
    }
}
