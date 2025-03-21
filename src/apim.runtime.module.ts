import "./polyfills";
import "@paperbits/core/ko/bindingHandlers/bindingHandlers.activate";
import "@paperbits/core/ko/bindingHandlers/bindingHandlers.component";
import "@paperbits/core/ko/bindingHandlers/bindingHandlers.dialog";
import "@paperbits/core/ko/bindingHandlers/bindingHandlers.focus";
import "@paperbits/core/ko/bindingHandlers/bindingHandlers.scrollable";
import "@paperbits/core/ko/bindingHandlers/bindingHandlers.listbox";
import { IInjector, IInjectorModule } from "@paperbits/common/injection";
import { ConsoleLogger } from "@paperbits/common/logging";
import { DefaultSessionManager } from "@paperbits/common/persistence/defaultSessionManager";
import { ViewStack } from "@paperbits/common/ui/viewStack";
import { BalloonBindingHandler, ResizableBindingHandler } from "@paperbits/core/ko/bindingHandlers";
import "./bindingHandlers/acceptChange";
import "./bindingHandlers/barChart";
import "./bindingHandlers/copyToClipboard";
import "./bindingHandlers/mapChart";
import "./bindingHandlers/markdown";
import "./bindingHandlers/minMaxAvgChart";
import "./bindingHandlers/scrollintoview";
import "./bindingHandlers/syntaxHighlight";
import "./bindingHandlers/tab";
import "./bindingHandlers/fastForeach";
import { ApiProducts } from "./components/apis/api-products/ko/runtime/api-products";
import { ApiProductsDropdown } from "./components/apis/api-products/ko/runtime/api-products-dropdown";
import { ApiProductsTiles } from "./components/apis/api-products/ko/runtime/api-products-tiles";
import { ApiDetails } from "./components/apis/details-of-api/ko/runtime/api-details";
import { ApiHistory } from "./components/apis/history-of-api/ko/runtime/api-history";
import { ApiList, ApiListDropdown, ApiListTiles } from "./components/apis/list-of-apis/ko/runtime";
import { DefaultAuthenticator } from "./components/defaultAuthenticator";
import { FileInput } from "./components/file-input/file-input";
import { CodeSnippet } from "./components/operations/operation-details/ko/runtime/code-snippet";
import { Authorization } from "./components/operations/operation-details/ko/runtime/authorization";
import { OperationConsole } from "./components/operations/operation-details/ko/runtime/operation-console";
import { GraphqlConsole } from "./components/operations/operation-details/ko/runtime/graphql-console";
import { GraphqlDocumentation } from "./components/operations/operation-details/ko/runtime/graphql-documentation/graphql-doc";
import { GraphqlDetails } from "./components/operations/operation-details/ko/runtime/graphql-documentation/graphql-doc-details";
import { GraphDocService } from "./components/operations/operation-details/ko/runtime/graphql-documentation/graphql-doc-service";
import { OperationDetails } from "./components/operations/operation-details/ko/runtime/operation-details";
import { TypeDefinitionViewModel } from "./components/operations/operation-details/ko/runtime/type-definition";
import { OperationList } from "./components/operations/operation-list/ko/runtime/operation-list";
import { ProductApis } from "./components/products/product-apis/ko/runtime/product-apis";
import { ProductApisTiles } from "./components/products/product-apis/ko/runtime/product-apis-tiles";
import { ProductDetails } from "./components/products/product-details/ko/runtime/product-details";
import { ProductList } from "./components/products/product-list/ko/runtime/product-list";
import { ProductListDropdown } from "./components/products/product-list/ko/runtime/product-list-dropdown";
import { ProductListTiles } from "./components/products/product-list/ko/runtime/product-list-tiles";
import { ProductSubscribe } from "./components/products/product-subscribe/ko/runtime/product-subscribe";
import { ProductSubscriptions } from "./components/products/product-subscriptions/ko/runtime/product-subscriptions";
import { Reports } from "./components/reports/ko/runtime/reports";
import { TagInput } from "./components/tag-input/tag-input";
import { ChangePassword } from "./components/users/change-password/ko/runtime/change-password";
import { ConfirmPassword } from "./components/users/confirm-password/ko/runtime/confirm-password";
import { Profile } from "./components/users/profile/ko/runtime/profile";
import { ResetPassword } from "./components/users/reset-password/ko/runtime/reset-password";
import { HipCaptcha } from "./components/users/runtime/hip-captcha/hip-captcha";
import { TermsOfUse } from "./components/users/runtime/terms-of-use/terms-of-use";
import { SignInAad } from "./components/users/signin-social/ko/runtime/signin-aad";
import { SignInAadB2C } from "./components/users/signin-social/ko/runtime/signin-aad-b2c";
import { Signin } from "./components/users/signin/ko/runtime/signin";
import { SignupSocial } from "./components/users/signup-social/ko/runtime/signup-social";
import { Signup } from "./components/users/signup/ko/runtime/signup";
import { Subscriptions } from "./components/users/subscriptions/ko/runtime/subscriptions";
import { ValidationSummary } from "./components/users/validation-summary/ko/runtime/validation-summary";
import { UnhandledErrorHandler } from "./errors/unhandledErrorHandler";
import { AadSignOutRouteGuard } from "./routing/aadSignoutRouteGuard";
import { RouteHelper } from "./routing/routeHelper";
import { SignOutRouteGuard } from "./routing/signOutRouteGuard";
import { StaticUserService } from "./services";
import { AadService } from "./services/aadService";
import { AnalyticsService } from "./services/analyticsService";
import { ApiService } from "./services/apiService";
import { BackendService } from "./services/backendService";
import { MapiClient } from "./services/mapiClient";
import { OAuthService } from "./services/oauthService";
import { ProductService } from "./services/productService";
import { ProvisionService } from "./services/provisioningService";
import { TagService } from "./services/tagService";
import { TenantService } from "./services/tenantService";
import { UsersService } from "./services/usersService";
import { ApimSettingsProvider } from "./configuration/apimSettingsProvider";
import { AccessTokenRefrsher } from "./authentication/accessTokenRefresher";
import { Pagination } from "./components/pagination/pagination";
import { StaticDataHttpClient } from "./services/staticDataHttpClient";
import { OauthServerConfiguration } from "./components/operations/operation-details/ko/runtime/oauth-server-configuration";
import { AadServiceV2 } from "./services/aadServiceV2";
import { RuntimeStaticDataProvider } from "./services/runtimeStaticDataProvider";
import { staticDataEnvironment } from "./../environmentConstants";


export class ApimRuntimeModule implements IInjectorModule {
    public register(injector: IInjector): void {
        injector.bindSingleton("logger", ConsoleLogger);
        injector.bindToCollection("autostart", UnhandledErrorHandler);
        injector.bindToCollection("autostart", BalloonBindingHandler);
        injector.bindToCollection("autostart", ResizableBindingHandler);
        injector.bindToCollection("routeGuards", AadSignOutRouteGuard);
        injector.bindToCollection("routeGuards", SignOutRouteGuard);
        injector.bind("apiList", ApiList);
        injector.bind("apiListDropdown", ApiListDropdown);
        injector.bind("apiListTiles", ApiListTiles);
        injector.bind("apiProducts", ApiProducts);
        injector.bind("apiProductsDropdown", ApiProductsDropdown);
        injector.bind("apiProductsTiles", ApiProductsTiles);
        injector.bind("apiDetails", ApiDetails);
        injector.bind("apiHistory", ApiHistory);
        injector.bind("operationDetails", OperationDetails);
        injector.bind("operationConsole", OperationConsole);
        injector.bind("graphqlConsole", GraphqlConsole);
        injector.bind("graphqlDocumentation", GraphqlDocumentation);
        injector.bind("graphqlDetails", GraphqlDetails);
        injector.bind("authorization", Authorization);
        injector.bind("typeDefinition", TypeDefinitionViewModel);
        injector.bind("codeSnippet", CodeSnippet);
        injector.bind("fileInput", FileInput);
        injector.bind("apiService", ApiService);
        injector.bind("tagService", TagService);
        injector.bind("productService", ProductService);
        injector.bind("analyticsService", AnalyticsService);
        injector.bind("signin", Signin);
        injector.bind("signInAad", SignInAad);
        injector.bind("signInAadB2C", SignInAadB2C);
        injector.bind("signup", Signup);
        injector.bind("signupSocial", SignupSocial);
        injector.bind("profile", Profile);
        injector.bind("subscriptions", Subscriptions);
        injector.bind("productList", ProductList);
        injector.bind("productListDropdown", ProductListDropdown);
        injector.bind("productListTiles", ProductListTiles);
        injector.bind("validationSummary", ValidationSummary);
        injector.bind("productDetails", ProductDetails);
        injector.bind("productSubscribe", ProductSubscribe);
        injector.bind("productSubscriptions", ProductSubscriptions);
        injector.bind("productApis", ProductApis);
        injector.bind("productApisTiles", ProductApisTiles);
        injector.bind("operationList", OperationList);
        injector.bind("operationDetails", OperationDetails);
        injector.bind("usersService", UsersService);
        injector.bind("reports", Reports);
        injector.bind("hipCaptcha", HipCaptcha);
        injector.bind("termsOfUse", TermsOfUse);
        injector.bind("resetPassword", ResetPassword);
        injector.bind("confirmPassword", ConfirmPassword);
        injector.bind("changePassword", ChangePassword);
        injector.bindSingleton("tenantService", TenantService);
        injector.bindSingleton("backendService", BackendService);
        injector.bindSingleton("aadService", AadService);
        injector.bindSingleton("aadServiceV2", AadServiceV2);
        injector.bindSingleton("mapiClient", MapiClient);
        injector.bindSingleton("settingsProvider", ApimSettingsProvider);
        injector.bindSingleton("authenticator", DefaultAuthenticator);
        injector.bindSingleton("routeHelper", RouteHelper);
        injector.bindSingleton("graphDocService", GraphDocService);
        injector.bindSingleton("userService", StaticUserService);
        injector.bindSingleton("provisioningService", ProvisionService);
        injector.bindSingleton("oauthService", OAuthService);
        injector.bindSingleton("viewStack", ViewStack);
        injector.bindSingleton("sessionManager", DefaultSessionManager);
        injector.bind("tagInput", TagInput);
        injector.bindToCollection("autostart", AccessTokenRefrsher);
        injector.bind("pagination", Pagination);
        injector.bind("oauthServerConfiguration", OauthServerConfiguration);

        if (process.env.NODE_ENV === staticDataEnvironment) {
            injector.bind("httpClient", StaticDataHttpClient);
            injector.bind("dataProvider", RuntimeStaticDataProvider);
        }
    }
}