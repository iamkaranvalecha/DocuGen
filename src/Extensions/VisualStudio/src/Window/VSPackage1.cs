using Community.VisualStudio.Toolkit;
using DocuGen.Command;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.ComponentModel.Design;
using Task = System.Threading.Tasks.Task;

namespace DocuGen.Window
{
    /// <summary>
    /// This is the class that implements the package exposed by this assembly.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The minimum requirement for a class to be considered a valid package for Visual Studio
    /// is to implement the IVsPackage interface and register itself with the shell.
    /// This package uses the helper classes defined inside the Managed Package Framework (MPF)
    /// to do it: it derives from the Package class that provides the implementation of the
    /// IVsPackage interface and uses the registration attributes defined in the framework to
    /// register itself and its components with the shell. These attributes tell the pkgdef creation
    /// utility what data to put into .pkgdef file.
    /// </para>
    /// <para>
    /// To get loaded into VS, the package must be referred by &lt;Asset Type="Microsoft.VisualStudio.VsPackage" ...&gt; in .vsixmanifest file.
    /// </para>
    /// </remarks>
    [PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
    [Guid(DocumentationGenerator.PackageGuidString)]
    [SuppressMessage("StyleCop.CSharp.DocumentationRules", "SA1650:ElementDocumentationMustBeSpelledCorrectly", Justification = "pkgdef, VS and vsixmanifest are valid VS terms")]
    public sealed class DocumentationGenerator : AsyncPackage
    {
        /// <summary>
        /// VSPackage1 GUID string.
        /// </summary>
        public const string PackageGuidString = "4b54cbd1-208f-429a-8d5b-7ab0611fec1a";

        /// <summary>
        /// Initializes a new instance of the <see cref="VSPackage1"/> class.
        /// </summary>
        public DocumentationGenerator()
        {
            // Inside this method you can place any initialization code that does not require
            // any Visual Studio service because at this point the package object is created but
            // not sited yet inside Visual Studio environment. The place to do all the other
            // initialization is the Initialize method.
        }

        #region Package Members

        /// <summary>
        /// Initialization of the package; this method is called right after the package is sited, so this is the place
        /// where you can put all the initialization code that rely on services provided by VisualStudio.
        /// </summary>
        /// <param name="cancellationToken">A cancellation token to monitor for initialization cancellation, which can occur when VS is shutting down.</param>
        /// <param name="progress">A provider for progress updates.</param>
        /// <returns>A task representing the async work of package initialization, or an already completed task if there is none. Do not return null from this method.</returns>
        protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
        {
            // When initialized asynchronously, the current thread may be a background thread at this point.
            // Do any initialization that requires the UI thread after switching to the UI thread.
            await this.JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

            await GenerateDocumentationCommand.InitializeAsync(this);
            this.PositionToolWindow();
        }

        #endregion

        private void PositionToolWindow()
        {
            ThreadHelper.ThrowIfNotOnUIThread();

            IVsWindowFrame solutionExplorerFrame = this.GetService(typeof(SVsUIShell)) as IVsWindowFrame;
            if (solutionExplorerFrame != null)
            {
                Guid solutionExplorerGuid = new Guid(ToolWindowGuids80.SolutionExplorer);
                IVsWindowFrame documentationExplorerFrame = this.FindToolWindow(typeof(DocumentationExplorerWindow), 0, true).Frame as IVsWindowFrame;
                if (documentationExplorerFrame != null)
                {
                    documentationExplorerFrame.SetProperty((int)__VSFPROPID.VSFPROPID_FrameMode, VSFRAMEMODE.VSFM_Dock);
                    documentationExplorerFrame.SetProperty((int)__VSFPROPID.VSFPROPID_DocView, solutionExplorerFrame);
                }
            }
        }
    }

    public class DocumentationExplorerWindow : ToolWindowPane
    {
        public DocumentationExplorerWindow() : base(null)
        {
            this.Caption = "Documentation Explorer";
            this.Content = new DocumentationExplorerPanel();
        }
    }

    public class DocumentationExplorerPanel : UserControl
    {
        private UserControl mainUI;
        private UserControl settingsUI;
        private ContentControl mainContent;

        public DocumentationExplorerPanel()
        {
            InitializeComponent();
            Themes.ThemeChanged += Themes_ThemeChanged;
        }

        private void InitializeComponent()
        {
            // Load the XAML for this control
            Application.LoadComponent(this, new Uri("/DocumentationGenerator;component/DocumentationExplorerPanel.xaml", UriKind.Relative));

            // Find the ContentControl in our XAML
            mainContent = (ContentControl)this.FindName("MainContent");

            // Load the XAML files for main UI and settings UI
            mainUI = LoadXamlUserControl("FilesView.xaml");
            settingsUI = LoadXamlUserControl("Settings.xaml");

            // Set up event handlers for the main UI
            var refreshButton = (Button)mainUI.FindName("RefreshButton");
            refreshButton.Click += RefreshButton_Click;

            var settingsButton = (Button)mainUI.FindName("SettingsButton");
            settingsButton.Click += SettingsButton_Click;

            var generateDocumentationButton = (Button)mainUI.FindName("GenerateDocumentationButton");
            generateDocumentationButton.Click += GenerateDocumentationButton_Click;

            // Set up event handlers for the settings UI
            var saveButton = (Button)settingsUI.FindName("SaveButton");
            saveButton.Click += SaveButton_Click;

            var cancelButton = (Button)settingsUI.FindName("CancelButton");
            cancelButton.Click += CancelButton_Click;

            // Start with the main UI
            mainContent.Content = mainUI;
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            throw new NotImplementedException();
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            throw new NotImplementedException();
        }

        private void GenerateDocumentationButton_Click(object sender, RoutedEventArgs e)
        {
            throw new NotImplementedException();
        }

        private void SettingsButton_Click(object sender, RoutedEventArgs e)
        {
            throw new NotImplementedException();
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            throw new NotImplementedException();
        }

        private UserControl LoadXamlUserControl(string xamlFileName)
        {
            var assembly = System.Reflection.Assembly.GetExecutingAssembly();
            var assemblyName = assembly.GetName().Name;
            var uri = new Uri($"/{assemblyName};component/{xamlFileName}", UriKind.Relative);
            return (UserControl)Application.LoadComponent(uri);
        }

        private void Themes_ThemeChanged(ThemeChangedEventArgs e)
        {
            // Update the theme for all controls
            Themes.ApplyTheme(this);
            Themes.ApplyTheme(mainUI);
            Themes.ApplyTheme(settingsUI);
        }

        // ... rest of the methods remain the same
    }
}
