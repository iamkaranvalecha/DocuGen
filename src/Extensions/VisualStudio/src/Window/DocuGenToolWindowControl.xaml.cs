using EnvDTE;
using EnvDTE80;
using Microsoft.VisualStudio.Shell;
using System.Windows;
using System.Windows.Controls;

namespace DocuGen.Window
{
    /// <summary>
    /// Interaction logic for DocuGenToolWindowControl.
    /// </summary>
    public partial class DocuGenToolWindowControl : UserControl
    {
        private DTE2 _dte;
        
        /// <summary>
        /// Initializes a new instance of the <see cref="DocuGenToolWindowControl"/> class.
        /// </summary>
        public DocuGenToolWindowControl()
        {
            ThreadHelper.ThrowIfNotOnUIThread();
            this.InitializeComponent();
            _dte = Package.GetGlobalService(typeof(DTE)) as DTE2;
        }

        private void GenerateDocumentation_Click(object sender, RoutedEventArgs e)
        {
            //var edgeJsIntegration = new EdgeJsIntegration();
            //var generatedDocumentation = edgeJsIntegration.GenerateDocumentationAsync(null).ConfigureAwait(false).GetAwaiter().GetResult();
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
        }
    }
}