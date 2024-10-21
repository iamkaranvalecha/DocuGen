### AI Generated Documentation using DocuGen
----
### File: CatalogItemService.cs
## Summary

### Class: `CatalogItemService`

This class manages interactions with Amazon's Catalog Items API. It extends from `RequestService` and requires `AmazonCredential` for authentication. The class includes deprecated methods and their newer replacements with versions for synchronous and asynchronous execution.

#### Constructor
```csharp
public CatalogItemService(AmazonCredential amazonCredential) : base(amazonCredential)
```
- **Purpose**: Initializes the `CatalogItemService` with the provided Amazon credentials.
- **Parameters**: 
  - `amazonCredential` (AmazonCredential): Required for authentication.

---

### Method: `ListCatalogItems`
```csharp
[Obsolete("This method deprecated in June 2022. Please use SearchCatalogItems202204 instead.", false)]
public IList<Item> ListCatalogItems(ParameterListCatalogItems parameterListCatalogItems)
```
- **Purpose**: Retrieves a list of catalog items based on provided parameters. Deprecated method.
- **Parameters**: 
  - `parameterListCatalogItems` (ParameterListCatalogItems): Contains filtering and pagination options.
- **Returns**: 
  - `IList<Item>`: List of catalog items.

#### Async Method: `ListCatalogItemsAsync`
```csharp
[Obsolete("This method deprecated in June 2022. Please use SearchCatalogItems202204Async instead.", false)]
public async Task<IList<Item>> ListCatalogItemsAsync(ParameterListCatalogItems parameterListCatalogItems)
```
- **Purpose**: Asynchronous version of `ListCatalogItems`. Deprecated method.
- **Parameters**: 
  - `parameterListCatalogItems` (ParameterListCatalogItems): Contains filtering and pagination options.
- **Returns**: 
  - `Task<IList<Item>>`: List of catalog items (async).

- **Errors**: Throws `InvalidDataException` if all search parameters are null or empty.

---

### Method: `GetCatalogItemJson`
```csharp
public String GetCatalogItemJson(string asin)
```
- **Purpose**: Retrieves the catalog item details as a JSON string.
- **Parameters**: 
  - `asin` (string): Amazon Standard Identification Number (ASIN) of the item.
- **Returns**: 
  - `String`: JSON string of the catalog item details.

#### Async Method: `GetCatalogItemAsyncJson`
```csharp
public async Task<String> GetCatalogItemAsyncJson(string asin)
```
- **Purpose**: Asynchronous version of `GetCatalogItemJson`.
- **Parameters**: 
  - `asin` (string): Amazon Standard Identification Number (ASIN) of the item.
- **Returns**: 
  - `Task<String>`: JSON string of the catalog item details (async).

- **Errors**: Throws `InvalidDataException` if `asin` is null or empty.

---

### Method: `GetCatalogItem`
```csharp
[Obsolete("This method deprecated in June 2022. Please use GetCatalogItem(ParameterGetCatalogItem parameterListCatalogItem) instead.", true)]
public Item GetCatalogItem(string asin)
```
- **Purpose**: Retrieves the catalog item based on ASIN. Deprecated method.
- **Parameters**: 
  - `asin` (string): Amazon Standard Identification Number (ASIN).
- **Returns**: 
  - `Item`: Catalog item object.

#### Async Method: `GetCatalogItemAsync`
```csharp
[Obsolete("This method deprecated in June 2022. Please use GetCatalogItem(ParameterGetCatalogItem parameterListCatalogItem) instead.", true)]
public async Task<Item> GetCatalogItemAsync(string asin)
```
- **Purpose**: Asynchronous version of `GetCatalogItem`. Deprecated method.
- **Parameters**: 
  - `asin` (string): Amazon Standard Identification Number (ASIN).
- **Returns**: 
  - `Task<Item>`: Catalog item object (async).

- **Errors**: Throws `InvalidDataException` if `asin` is null or empty.

---

### Method: `ListCatalogCategories`
```csharp
public IList<Categories> ListCatalogCategories(string ASIN, string SellerSKU = null, string MarketPlaceID = null)
```
- **Purpose**: Lists categories for a catalog item.
- **Parameters**: 
  - `ASIN` (string): Amazon Standard Identification Number.
  - `SellerSKU` (string, optional): Seller SKU.
  - `MarketPlaceID` (string, optional): Marketplace ID.
- **Returns**: 
  - `IList<Categories>`: List of categories.

#### Async Method: `ListCatalogCategoriesAsync`
```csharp
public async Task<IList<Categories>> ListCatalogCategoriesAsync(string ASIN, string SellerSKU = null, string MarketPlaceID = null, CancellationToken cancellationToken = default)
```
- **Purpose**: Asynchronous version of `ListCatalogCategories`.
- **Parameters**:
  - `ASIN` (string): Amazon Standard Identification Number.
  - `SellerSKU` (string, optional): Seller SKU.
  - `MarketPlaceID` (string, optional): Marketplace ID.
  - `cancellationToken` (CancellationToken, optional): Token for operation cancellation.
- **Returns**: 
  - `Task<IList<Categories>>`: List of categories (async).

- **Errors**: Throws `InvalidDataException` if `ASIN` is null or empty.

---

### Method: `GetCatalogItem202204`
```csharp
public AmazonSpApiSDK.Models.CatalogItems.V20220401.Item GetCatalogItem202204(ParameterGetCatalogItem parameterGetCatalogItem)
```
- **Purpose**: Retrieves details for an item in the catalog using 2022 API.
- **Parameters**: 
  - `parameterGetCatalogItem` (ParameterGetCatalogItem): Parameters for the request.
- **Returns**: 
  - `Item`: Catalog item object.

#### Async Method: `GetCatalogItem202204Async`
```csharp
public async Task<AmazonSpApiSDK.Models.CatalogItems.V20220401.Item> GetCatalogItem202204Async(ParameterGetCatalogItem parameterGetCatalogItem, CancellationToken cancellationToken = default)
```
- **Purpose**: Asynchronous version of `GetCatalogItem202204`.
- **Parameters**:
  - `parameterGetCatalogItem` (ParameterGetCatalogItem): Parameters for the request.
  - `cancellationToken` (CancellationToken, optional): Token for operation cancellation.
- **Returns**: 
  - `Task<Item>`: Catalog item object (async).

- **Errors**: Throws `InvalidDataException` if `ASIN` is null or missing required properties.

---

### Method: `SearchCatalogItems202204`
```csharp
public IList<AmazonSpApiSDK.Models.CatalogItems.V20220401.Item> SearchCatalogItems202204(ParameterSearchCatalogItems202204 parameterSearchCatalogItems)
```
- **Purpose**: Searches catalog items using 2022 API.
- **Parameters**: 
  - `parameterSearchCatalogItems` (ParameterSearchCatalogItems202204): Search parameters.
- **Returns**: 
  - `IList<Item>`: List of catalog items.

#### Async Method: `SearchCatalogItems202204Async`
```csharp
public async Task<IList<AmazonSpApiSDK.Models.CatalogItems.V20220401.Item>> SearchCatalogItems202204Async(ParameterSearchCatalogItems202204 parameter, CancellationToken cancellationToken = default)
```
- **Purpose**: Asynchronous version of `SearchCatalogItems202204`.
- **Parameters**:
  - `parameter` (ParameterSearchCatalogItems202204): Search parameters.
  - `cancellationToken` (CancellationToken, optional): Token for operation cancellation.
- **Returns**: 
  - `Task<IList<Item>>`: List of catalog items (async).

- **Errors**: Throws `InvalidDataException` if search parameters are invalid.

#### Private Async Method: `SearchCatalogItemsByNextToken202204Async`
```csharp
private async Task<ItemSearchResults> SearchCatalogItemsByNextToken202204Async(ParameterSearchCatalogItems202204 parameter, CancellationToken cancellationToken = default)
```
- **Purpose**: Handles paginated results for `SearchCatalogItems202204Async`.
- **Parameters**:
  - `parameter` (ParameterSearchCatalogItems202204): Search parameters with next token.
  - `cancellationToken` (CancellationToken, optional): Token for operation cancellation.
- **Returns**: 
  - `Task<ItemSearchResults>`: Item search results for the next page (async).

---

### Dependencies
- **FikaAmazonAPI**: The namespace and its classes/methods are used for interacting with Amazon SP-API.
- **`RestSharp`**: For making HTTP requests.
- **`System.Threading.Tasks`**: For asynchronous method implementation.

### Best Practices
- **Error Handling**: Consistent use of `InvalidDataException` to handle invalid input.
- **Deprecation**: Clearly marked deprecated methods with alternative recommendations.
- **Asynchronous Programming**: Utilized `Task` and `async/await` for non-blocking operations.

### Sensitive Information
- **AmazonCredential**: Make sure this contains sensitive API credentials and should be handled securely. Placeholder `[SECRET]` can be used when displaying such information.

### Assumptions
- **None**: The analysis strictly adheres to the content provided without assumptions.

----
