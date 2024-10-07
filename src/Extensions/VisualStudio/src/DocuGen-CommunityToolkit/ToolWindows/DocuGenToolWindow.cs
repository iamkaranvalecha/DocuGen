using Microsoft.VisualStudio.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace DocuGen_CommunityToolkit
{
    public class DocuGenToolWindow : BaseToolWindow<DocuGenToolWindow>
    {
        public override string GetTitle(int toolWindowId) => "DocuGenToolWindow";

        public override Type PaneType => typeof(Pane);

        public override Task<FrameworkElement> CreateAsync(int toolWindowId, CancellationToken cancellationToken)
        {
            return Task.FromResult<FrameworkElement>(new DocuGenToolWindowControl());
        }

        [Guid("f5f8ee74-b9a4-467e-bfdd-a20d3c5cbd9a")]
        internal class Pane : ToolkitToolWindowPane
        {
            public Pane()
            {
                BitmapImageMoniker = KnownMonikers.ToolWindow;
            }
        }
    }
}
