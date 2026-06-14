using System.Text;
using expenseKubex.Config;
using expenseKubex.Data;
using expenseKubex.Models;
using expenseKubex.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token. Example: eyJhbGciOi..."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document, null)] = new List<string>()
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.Configure<GmailSmtpSettings>(builder.Configuration.GetSection("GmailSmtpSettings"));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddHttpClient("OcrService", client =>
{
    client.Timeout = TimeSpan.FromSeconds(45);
});
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailSender, GmailSmtpEmailSender>();

var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings configuration is missing.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
        };
    });

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
    dbContext.Database.ExecuteSqlRaw($"ALTER TABLE expenses ADD COLUMN IF NOT EXISTS \"Status\" character varying(20) NOT NULL DEFAULT '{Expense.DraftStatus}';");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS ""ReviewedAtUtc"" timestamp with time zone NULL;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS ""ReviewedByUserId"" uuid NULL;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS ""ReviewComment"" character varying(500) NULL;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS ""Role"" character varying(30) NOT NULL DEFAULT 'Employee';
    ");

    await dbContext.Database.ExecuteSqlRawAsync(@"
        UPDATE users
        SET ""Role"" = 'Employee'
        WHERE ""Role"" IS NULL OR ""Role"" = '';
    ");
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
