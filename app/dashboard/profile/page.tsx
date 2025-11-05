"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  DollarSign,
  Camera,
  Save,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/lib/error-handler";
import { format } from "date-fns";

interface EmployeeProfile {
  id: string;
  employeeId: string;
  department: string;
  position: string;
  salary: number | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
    createdAt: string;
  };
}

interface ProfileFormData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  bio?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Form data
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Profile picture state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []); // Empty dependency array - only run once on mount

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees/me");
      const result = await response.json();

      if (result.success && result.data) {
        const profileData = result.data;
        setProfile(profileData);
        setProfileForm({
          name: profileData.user.name || "",
          email: profileData.user.email || "",
          phone: profileData.user.phone || "",
          address: profileData.user.address || "",
          bio: profileData.user.bio || "",
        });
        // Always set the image from the database
        console.log(
          "Setting profile image from database:",
          profileData.user.image
        );
        setProfileImage(profileData.user.image);
      } else {
        showErrorToast("Failed to load profile data");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showErrorToast("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const response = await fetch("/api/employees/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast("Profile updated successfully");
        // Update session with new data
        await update();
        fetchProfile();
        // Notify header to refresh data
        window.dispatchEvent(new CustomEvent("profileImageUpdated"));
      } else {
        showErrorToast(result.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showErrorToast("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!passwordForm.currentPassword.trim()) {
      showErrorToast("Current password is required");
      return;
    }

    if (!passwordForm.newPassword.trim()) {
      showErrorToast("New password is required");
      return;
    }

    if (!passwordForm.confirmPassword.trim()) {
      showErrorToast("Please confirm your new password");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showErrorToast("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showErrorToast("New password must be at least 8 characters long");
      return;
    }

    // Check if new password is same as current password
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      showErrorToast("New password must be different from current password");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/employees/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showSuccessToast("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        showErrorToast(result.message || result.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      showErrorToast("Error changing password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select an image file");
      return;
    }

    // Validate file size (max 10MB for Cloudinary)
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast("Image size must be less than 10MB");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/employees/profile/image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast("Profile picture updated successfully");
        // Refresh profile data to get the updated image URL
        await fetchProfile();
        // Notify header to refresh image
        window.dispatchEvent(new CustomEvent("profileImageUpdated"));
        console.log("Image upload successful");
      } else {
        showErrorToast(result.message || "Failed to update profile picture");
        // Reset to original image on failure
        setProfileImage(profile?.user.image || null);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showErrorToast("Error uploading profile picture");
      // Reset to original image on error
      setProfileImage(profile?.user.image || null);
    } finally {
      setUploadingImage(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">
          Manage your personal information and account settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {profileImage && profileImage.trim() !== "" ? (
                      <AvatarImage src={profileImage} alt={profile.user.name} />
                    ) : null}
                    <AvatarFallback className="text-lg">
                      {profile.user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="image-upload"
                    className={`absolute bottom-0 right-0 text-white rounded-full p-2 cursor-pointer transition-colors ${
                      uploadingImage
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {uploadingImage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{profile.user.name}</h2>
                  <p className="text-gray-600">{profile.user.email}</p>
                  <Badge variant="outline" className="mt-2">
                    {profile.user.role}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{profile.position}</p>
                    <p className="text-sm text-gray-600">
                      {profile.department?.name || profile.department || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Employee ID</p>
                    <p className="text-sm text-gray-600">
                      {profile.employeeId}
                    </p>
                  </div>
                </div>
                {profile.salary && (
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Salary</p>
                      <p className="text-sm text-gray-600">
                        ${profile.salary.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Member since{" "}
                    {format(new Date(profile.createdAt), "MMM yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Settings */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList>
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={profileForm.address}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          placeholder="Enter your address"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            bio: e.target.value,
                          }))
                        }
                        placeholder="Tell us about yourself"
                        rows={3}
                      />
                    </div>

                    <Button type="submit" disabled={saving} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>Change Password</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          placeholder="Enter current password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility("current")}
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          placeholder="Enter new password"
                          required
                          minLength={8}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility("new")}
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          placeholder="Confirm new password"
                          required
                          minLength={8}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility("confirm")}
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" disabled={saving} className="w-full">
                      <Key className="h-4 w-4 mr-2" />
                      {saving ? "Changing..." : "Change Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
