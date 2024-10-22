using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell.Interop;

namespace DocuGen
{
    internal class SolutionEventsHandler : IVsSolutionEvents
    {
        public int OnAfterCloseSolution(object pUnkReserved)
        {
            // Handle when a solution is closed
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Solution closed.");
            return VSConstants.S_OK;
        }

        public int OnAfterLoadProject(IVsHierarchy pStubHierarchy, IVsHierarchy pRealHierarchy)
        {
            // Handle when a project is loaded in the solution
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Project loaded.");
            return VSConstants.S_OK;
        }

        public int OnAfterOpenProject(IVsHierarchy pHierarchy, int fAdded)
        {
            // Handle when a project is opened in the solution
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Project opened.");
            return VSConstants.S_OK;
        }

        public int OnAfterOpenSolution(object pUnkReserved, int fNewSolution)
        {
            // Handle when a solution is opened
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Solution opened.");
            return VSConstants.S_OK;
        }

        public int OnBeforeCloseProject(IVsHierarchy pHierarchy, int fRemoved)
        {
            // Handle when a project is about to be closed
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Project closing.");
            return VSConstants.S_OK;
        }

        public int OnBeforeCloseSolution(object pUnkReserved)
        {
            // Handle when a solution is about to be closed
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Solution is about to close.");
            return VSConstants.S_OK;
        }

        public int OnBeforeUnloadProject(IVsHierarchy pRealHierarchy, IVsHierarchy pStubHierarchy)
        {
            // Handle when a project is about to be unloaded
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Project unloading.");
            return VSConstants.S_OK;
        }

        public int OnQueryCloseProject(IVsHierarchy pHierarchy, int fRemoving, ref int pfCancel)
        {
            // Handle a query to close a project (can be used to cancel closing)
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Query project close.");
            return VSConstants.S_OK;
        }

        public int OnQueryCloseSolution(object pUnkReserved, ref int pfCancel)
        {
            // Handle a query to close the solution (can be used to cancel closing)
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Query solution close.");
            return VSConstants.S_OK;
        }

        public int OnQueryUnloadProject(IVsHierarchy pRealHierarchy, ref int pfCancel)
        {
            // Handle a query to unload a project (can be used to cancel unloading)
            ThreadHelper.ThrowIfNotOnUIThread();
            Console.WriteLine("Query project unload.");
            return VSConstants.S_OK;
        }
    }
}